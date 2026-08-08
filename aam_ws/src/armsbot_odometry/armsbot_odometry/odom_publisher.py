#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32
from nav_msgs.msg import Odometry
from geometry_msgs.msg import TransformStamped
from tf2_ros import TransformBroadcaster
import math

# ─── Robot Parameters ────────────────────────────────────────────────────────
WHEEL_RADIUS        = 0.05       # metres  (100 mm)
WHEEL_SEPARATION    = 0.42      # metres  (420 mm)
TICKS_PER_REV       = 5040.0    # encoder ticks per full wheel revolution
METRES_PER_TICK     = (2.0 * math.pi * WHEEL_RADIUS) / TICKS_PER_REV
# ─────────────────────────────────────────────────────────────────────────────

class MotorTicksToOdom(Node):
    def __init__(self):
        super().__init__('motor_ticks_to_odom')

        self.declare_parameter('wheel_radius',      WHEEL_RADIUS)
        self.declare_parameter('wheel_separation',  WHEEL_SEPARATION)
        self.declare_parameter('ticks_per_rev',     TICKS_PER_REV)
        self.declare_parameter('left_topic',        'left_ticks')
        self.declare_parameter('right_topic',       'right_ticks')
        self.declare_parameter('odom_topic',        '/odom')
        self.declare_parameter('odom_frame',        'odom')
        self.declare_parameter('base_frame',        'base_link')
        self.declare_parameter('publish_tf',        True)

        r   = self.get_parameter('wheel_radius').value
        ws  = self.get_parameter('wheel_separation').value
        tpr = self.get_parameter('ticks_per_rev').value

        self.metres_per_tick = (2.0 * math.pi * r) / tpr
        self.wheel_sep       = ws
        self.odom_frame      = self.get_parameter('odom_frame').value
        self.base_frame      = self.get_parameter('base_frame').value
        self.publish_tf      = self.get_parameter('publish_tf').value

        self.x     = 0.0
        self.y     = 0.0
        self.theta = 0.0

        self.prev_left_ticks  = None   
        self.prev_right_ticks = None
        self.last_left_ticks  = None   
        self.last_right_ticks = None
        
        # Track time for velocity calculation
        self.last_time = self.get_clock().now()

        left_topic  = self.get_parameter('left_topic').value
        right_topic = self.get_parameter('right_topic').value

        self.sub_left  = self.create_subscription(Int32, left_topic,  self._left_cb,  10)
        self.sub_right = self.create_subscription(Int32, right_topic, self._right_cb, 10)

        odom_topic = self.get_parameter('odom_topic').value
        self.odom_pub = self.create_publisher(Odometry, odom_topic, 10)

        if self.publish_tf:
            self.tf_broadcaster = TransformBroadcaster(self)

    def _left_cb(self, msg: Int32):
        self.last_left_ticks = msg.data
        self._try_update()

    def _right_cb(self, msg: Int32):
        self.last_right_ticks = msg.data
        self._try_update()

    def _try_update(self):
        if self.last_left_ticks is None or self.last_right_ticks is None:
            return  

        if self.prev_left_ticks is None:
            self.prev_left_ticks  = self.last_left_ticks
            self.prev_right_ticks = self.last_right_ticks
            self.last_time = self.get_clock().now()
            return

        current_time = self.get_clock().now()
        dt = (current_time.nanoseconds - self.last_time.nanoseconds) / 1e9

        # Invert the deltas to fix the backward and flipped-turn odometry
        delta_left  = -((self.last_left_ticks  - self.prev_left_ticks)  * self.metres_per_tick)
        delta_right = -((self.last_right_ticks - self.prev_right_ticks) * self.metres_per_tick)

        self.prev_left_ticks  = self.last_left_ticks
        self.prev_right_ticks = self.last_right_ticks
        self.last_time = current_time

        delta_s     = (delta_right + delta_left)  / 2.0   
        delta_theta = (delta_right - delta_left)  / self.wheel_sep  

        self.theta += delta_theta / 2.0
        self.x     += delta_s * math.cos(self.theta)
        self.y     += delta_s * math.sin(self.theta)
        self.theta += delta_theta / 2.0

        self.theta = math.atan2(math.sin(self.theta), math.cos(self.theta))

        # Calculate Velocities
        v = 0.0
        omega = 0.0
        if dt > 0:
            v = delta_s / dt
            omega = delta_theta / dt

        self._publish_odom(current_time.to_msg(), v, omega)

    def _publish_odom(self, stamp, v, omega):
        qz = math.sin(self.theta / 2.0)
        qw = math.cos(self.theta / 2.0)

        odom = Odometry()
        odom.header.stamp    = stamp
        odom.header.frame_id = self.odom_frame
        odom.child_frame_id  = self.base_frame

        # Pose
        odom.pose.pose.position.x  = self.x
        odom.pose.pose.position.y  = self.y
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw
        odom.pose.covariance[0]  = 0.001   
        odom.pose.covariance[7]  = 0.001   
        odom.pose.covariance[35] = 0.001   

        # Twist (Velocity) - NEW!
        odom.twist.twist.linear.x = v
        odom.twist.twist.angular.z = omega
        odom.twist.covariance[0] = 0.001
        odom.twist.covariance[35] = 0.001

        self.odom_pub.publish(odom)

        if self.publish_tf:
            t = TransformStamped()
            t.header.stamp            = stamp
            t.header.frame_id         = self.odom_frame
            t.child_frame_id          = self.base_frame
            t.transform.translation.x = self.x
            t.transform.translation.y = self.y
            t.transform.rotation.z    = qz
            t.transform.rotation.w    = qw
            self.tf_broadcaster.sendTransform(t)

def main(args=None):
    rclpy.init(args=args)
    node = MotorTicksToOdom()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()