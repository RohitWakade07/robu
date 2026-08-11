#!/usr/bin/env python3
"""
auto_docker.py — Reliable two-phase docking node.
"""

import rclpy
from rclpy.node import Node
from rclpy.parameter import Parameter
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from std_msgs.msg import Float64MultiArray
import tf2_ros
import math
import sys

# ---------------------------------------------------------------------------
# MISSION CONFIGURATION
# ---------------------------------------------------------------------------
PRE_LIFT_PICK = 0.28   # Lift to this height before driving into rack
LIFT_PICK     = 0.35   # Lift to this height to pick the pallet off shelf
PRE_LIFT_DROP = 0.35   # Keep high before entering rack to drop
LIFT_DROP     = 0.28   # Lower to this height to drop pallet on shelf

UNDOCK_DISTANCE = 0.1    
STOP_DISTANCE   = 0.15    
HARD_STOP_DISTANCE = 0.05  

# ---------------------------------------------------------------------------
# APPROACH TUNING
# ---------------------------------------------------------------------------
LOOP_HZ       = 30.0
TF_MAX_AGE_SEC = 10.0       

KP_LIN = 0.3   # Slower
KP_ANG = 0.6   # Faster alignment
MIN_ANG = 0.05; MAX_ANG = 0.5
MAX_LIN_ACCEL = 0.2; MAX_ANG_ACCEL = 1.0

CRUISE_MIN_LIN = 0.1     
CRUISE_MAX_LIN = 0.25     

ALIGN_ZONE_DISTANCE = 0.5  # Stop and align Y here
BLIND_TRIGGER_MAX_DISTANCE = 0.6  
CREEP_SPEED           = 0.05 

ODOM_TIMEOUT_SEC  = 1.0
ODOM_BRAKE_MARGIN = 0.025   

def clamp(x, a, b):
    return max(a, min(b, x))

class AutoDockerNode(Node):
    def __init__(self, target_id):
        super().__init__(
            "auto_docker_node",
            parameter_overrides=[Parameter('use_sim_time', Parameter.Type.BOOL, True)]
        )

        self.team_id   = 'arms_warehouse'
        self.target_id = target_id
        self.is_picking = target_id in [1, 2, 3, 4]

        if self.is_picking:
            self.marker_frame = f"{self.team_id}_box_{target_id}_goal"
        else:
            self.marker_frame = f"{self.team_id}_rack_slot_{target_id}_goal"

        self.robot_frame = "base_link"

        self.pub_cmd  = self.create_publisher(Twist, "/cmd_vel", 10)
        self.lift_pub = self.create_publisher(Float64MultiArray, '/linear_actuator_controller/commands', 10)

        self.tf_buffer   = tf2_ros.Buffer()
        self.tf_listener = tf2_ros.TransformListener(self.tf_buffer, self)

        self.odom_x             = None
        self.odom_y             = None
        self.odom_last_received = 0.0
        self.odom_start_x       = None
        self.odom_start_y       = None
        self.create_subscription(Odometry, '/odom', self._odom_cb, 10)

        self.timer = self.create_timer(1.0 / LOOP_HZ, self.loop)

        self.state        = "CRUISE"
        self.prev_lin_cmd = 0.0
        self.prev_ang_cmd = 0.0

        self.state_start_time    = 0.0
        self.last_known_distance = 0.0
        self.marker_ever_seen    = False

        self.blind_target_distance  = 0.0
        self.blind_drive_duration   = 0.0
        self.undock_target_distance = 0.0
        self.undock_drive_duration  = 0.0

        self._shutdown_requested = False
        self.last_time = self.time_now()

        self.get_logger().info(f"Auto Docker — ID {self.target_id} | STOP={STOP_DISTANCE}m")

    def _odom_cb(self, msg: Odometry):
        self.odom_x             = msg.pose.pose.position.x
        self.odom_y             = msg.pose.pose.position.y
        self.odom_last_received = self.time_now()

    def odom_ok(self) -> bool:
        return (self.odom_x is not None and
                (self.time_now() - self.odom_last_received) < ODOM_TIMEOUT_SEC)

    def snapshot_odom(self):
        self.odom_start_x = self.odom_x
        self.odom_start_y = self.odom_y

    def odom_travelled(self) -> float:
        if self.odom_start_x is None or self.odom_x is None:
            return 0.0
        dx = self.odom_x - self.odom_start_x
        dy = self.odom_y - self.odom_start_y
        return math.sqrt(dx * dx + dy * dy)

    def time_now(self) -> float:
        t = self.get_clock().now()
        s, ns = t.seconds_nanoseconds()
        return s + ns * 1e-9

    def hard_stop_check(self, dist_m: float) -> bool:
        if dist_m < HARD_STOP_DISTANCE:
            self.get_logger().error(f"HARD STOP: dist={dist_m:.3f}m < {HARD_STOP_DISTANCE}m")
            self.trigger_lift_state()
            return True
        return False

    def loop(self):
        if self._shutdown_requested:
            return

        now = self.time_now()
        dt  = now - self.last_time
        if dt <= 0:
            dt = 1.0 / LOOP_HZ
        self.last_time = now

        if self.state == "CRUISE":
            try:
                t_mark = self.tf_buffer.lookup_transform(
                    self.robot_frame, self.marker_frame, rclpy.time.Time()
                )
                stamp = t_mark.header.stamp
                age   = now - (stamp.sec + stamp.nanosec * 1e-9)
                if age >= TF_MAX_AGE_SEC:
                    raise Exception(f"TF stale {age:.3f}s")

                dx_m   = t_mark.transform.translation.x
                dy_m   = t_mark.transform.translation.y
                dist_m = math.sqrt(dx_m**2 + dy_m**2)
                ang_m  = math.atan2(dy_m, dx_m)

                self.last_known_distance = dist_m
                self.marker_ever_seen    = True

                if self.hard_stop_check(dist_m):
                    return

                if dist_m <= ALIGN_ZONE_DISTANCE:
                    self.get_logger().info(f"Entering ALIGN zone at {dist_m:.3f}m.")
                    self.stop()
                    self.state = "ALIGN_X"
                    return

                raw_lin   = KP_LIN * dist_m
                lin_speed = clamp(raw_lin, CRUISE_MIN_LIN, CRUISE_MAX_LIN)

                if abs(ang_m) > 0.1:
                    ang_speed = KP_ANG * ang_m
                    ang_speed = math.copysign(clamp(abs(ang_speed), MIN_ANG, MAX_ANG), ang_speed)
                else:
                    ang_speed = 0.0

                self.cmd(self.ramp_linear(lin_speed, dt), self.ramp_angular(ang_speed, dt))

            except Exception as e:
                self.get_logger().warn(f"TF failed: {e}", throttle_duration_sec=2.0)
                self.stop()

        elif self.state == "ALIGN_X":
            try:
                t_mark = self.tf_buffer.lookup_transform(
                    self.robot_frame, self.marker_frame, rclpy.time.Time()
                )
                dx_m   = t_mark.transform.translation.x
                dy_m   = t_mark.transform.translation.y
                ang_m  = math.atan2(dy_m, dx_m)

                if abs(ang_m) < 0.02:
                    self.get_logger().info(f"Aligned successfully. Pre-lifting.")
                    self.trigger_pre_lift_state()
                    return

                ang_speed = KP_ANG * ang_m
                ang_speed = math.copysign(clamp(abs(ang_speed), MIN_ANG, MAX_ANG), ang_speed)
                self.cmd(0.0, self.ramp_angular(ang_speed, dt))
            except Exception:
                self.stop()

        elif self.state == "PRE_LIFT":
            elapsed = now - self.state_start_time
            if elapsed > 2.0:
                self.trigger_creep_state()
            else:
                self.cmd(0.0, 0.0)

        elif self.state == "CREEP":
            travelled = self.odom_travelled()
            elapsed   = now - self.state_start_time

            ang_speed = 0.0
            try:
                t_mark = self.tf_buffer.lookup_transform(
                    self.robot_frame, self.marker_frame, rclpy.time.Time()
                )
                dx_m   = t_mark.transform.translation.x
                dy_m   = t_mark.transform.translation.y
                dist_m = math.sqrt(dx_m**2 + dy_m**2)
                
                if self.hard_stop_check(dist_m):
                    return
                    
                ang_m = math.atan2(dy_m, dx_m)
                if abs(ang_m) > 0.05:
                    ang_speed = KP_ANG * ang_m
                    ang_speed = math.copysign(clamp(abs(ang_speed), MIN_ANG, MAX_ANG), ang_speed)
            except Exception:
                pass

            stop_at = self.blind_target_distance - ODOM_BRAKE_MARGIN
            if self.odom_ok() and travelled >= stop_at:
                self.get_logger().info(f"CREEP done (odom): {travelled:.3f}m. Picking.")
                self.trigger_lift_state()
                return

            if not self.odom_ok() and elapsed >= self.blind_drive_duration:
                self.trigger_lift_state()
                return

            self.cmd(self.ramp_linear(CREEP_SPEED, dt), self.ramp_angular(ang_speed, dt))

        elif self.state == "PICKING":
            if (now - self.state_start_time) > 2.0:
                self.trigger_undock_state()

        elif self.state == "UNDOCKING":
            travelled = self.odom_travelled()
            elapsed   = now - self.state_start_time

            if self.odom_ok():
                if travelled >= (self.undock_target_distance - ODOM_BRAKE_MARGIN):
                    self.trigger_done()
                    return
            else:
                if elapsed >= self.undock_drive_duration:
                    self.trigger_done()
                    return

            self.cmd(self.ramp_linear(-CRUISE_MAX_LIN, dt), 0.0)

    def trigger_pre_lift_state(self):
        self.stop()
        self.state            = "PRE_LIFT"
        self.state_start_time = self.time_now()
        
        target = PRE_LIFT_PICK if self.is_picking else PRE_LIFT_DROP
        lift_msg      = Float64MultiArray()
        lift_msg.data = [float(target)]
        self.lift_pub.publish(lift_msg)

    def trigger_creep_state(self):
        self.stop()
        self.state                 = "CREEP"
        self.state_start_time      = self.time_now()
        dist_to_cover              = max(self.last_known_distance - STOP_DISTANCE, 0.0)
        self.blind_target_distance = dist_to_cover
        self.blind_drive_duration  = (dist_to_cover / CREEP_SPEED) + 1.0
        if self.odom_ok():
            self.snapshot_odom()

    def trigger_lift_state(self):
        self.stop()
        self.state               = "PICKING"
        self.state_start_time    = self.time_now()
        
        target = LIFT_PICK if self.is_picking else LIFT_DROP
        lift_msg      = Float64MultiArray()
        lift_msg.data = [float(target)]
        self.lift_pub.publish(lift_msg)

    def trigger_undock_state(self):
        self.stop()
        self.state            = "UNDOCKING"
        self.state_start_time = self.time_now()

        total_reverse               = STOP_DISTANCE + UNDOCK_DISTANCE
        self.undock_target_distance = total_reverse
        self.undock_drive_duration  = total_reverse / CRUISE_MAX_LIN

        if self.odom_ok():
            self.snapshot_odom()
            
    def trigger_done(self):
        self.stop()
        self.state = "DONE"
        # Reset lift to 0 at the end if desired, or keep it up
        if not self.is_picking:
            lift_msg = Float64MultiArray()
            lift_msg.data = [0.0]
            self.lift_pub.publish(lift_msg)
            
        self._shutdown_requested = True
        rclpy.shutdown()

    def cmd(self, l, a):
        m = Twist()
        m.linear.x  = float(l)
        m.angular.z = float(a)
        self.pub_cmd.publish(m)

    def stop(self):
        self.pub_cmd.publish(Twist())
        self.prev_lin_cmd = 0.0
        self.prev_ang_cmd = 0.0

    def ramp_linear(self, d, dt):
        self.prev_lin_cmd += clamp(d - self.prev_lin_cmd, -MAX_LIN_ACCEL * dt, MAX_LIN_ACCEL * dt)
        return float(self.prev_lin_cmd)

    def ramp_angular(self, d, dt):
        self.prev_ang_cmd += clamp(d - self.prev_ang_cmd, -MAX_ANG_ACCEL * dt, MAX_ANG_ACCEL * dt)
        return float(self.prev_ang_cmd)

def main(args=None):
    rclpy.init(args=args)
    target_id = 1
    if len(sys.argv) > 1:
        try: 
            target_id = int(sys.argv[1])
        except ValueError: 
            pass
    
    node = AutoDockerNode(target_id)
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if rclpy.ok():
            node.stop()
            rclpy.shutdown()

if __name__ == "__main__":
    main()