"""
Author: Maaz Shaikh
PRN: 1032233996
Node: Robot Hardware Node (Throttled & Daemon-Safe)

PATCHED: every rpc_call() failure was previously caught with a bare
`except Exception: pass`, so when the STM32/router link went bad there was
no way to see it from the ROS 2 side -- topics just silently stopped updating.
This version logs failures (throttled to 1/sec so it doesn't spam) so a dead
link shows up immediately in `ros2 log` / the console instead of only being
visible as "the robot stopped responding".
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32, Float32
from geometry_msgs.msg import Twist, Vector3
from aamros.bridge_client import rpc_call


class RobotHardwareNode(Node):
    def __init__(self):
        super().__init__('robot_hardware')

        self.pub_ticks_l = self.create_publisher(Int32, '/left_ticks', 10)
        self.pub_ticks_r = self.create_publisher(Int32, '/right_ticks', 10)
        self.pub_actual_l = self.create_publisher(Float32, '/left_actual_vel', 10)
        self.pub_actual_r = self.create_publisher(Float32, '/right_actual_vel', 10)
        self.pub_target_l = self.create_publisher(Float32, '/left_target_vel', 10)
        self.pub_target_r = self.create_publisher(Float32, '/right_target_vel', 10)
        self.pub_battery = self.create_publisher(Float32, '/battery', 10)

        self.create_subscription(Twist, '/cmd_vel', self.cmd_vel_callback, 10)
        self.create_subscription(Float32, '/target_position', self.position_callback, 10)

        # Buffer to hold commands instead of instantly sending them
        self.pending_cmd_vel = None
        self.pending_position = None

        # Track consecutive failures so we only log "link is down" once, not every 100ms
        self._consecutive_failures = 0

        # Lower polling rate to 10Hz (0.1s) to let the RPC daemon breathe
        self.create_timer(0.1, self.poll_stm32)
        self.get_logger().info('Unified Hardware node started (Throttled).')

    def cmd_vel_callback(self, msg):
        # DO NOT open a socket here! Just save the command.
        self.pending_cmd_vel = [msg.linear.x, msg.angular.z]

    def position_callback(self, msg):
        self.pending_position = [msg.data]

    def _note_success(self):
        if self._consecutive_failures >= 5:
            self.get_logger().info('STM32 link recovered.')
        self._consecutive_failures = 0

    def _note_failure(self, context):
        self._consecutive_failures += 1
        # Log every failure at low rate, and always log the moment it *becomes* a streak
        self.get_logger().warn(
            f'RPC call failed ({context}); consecutive failures={self._consecutive_failures}',
            throttle_duration_sec=1.0,
        )
        if self._consecutive_failures == 5:
            self.get_logger().error(
                'STM32/arduino-router link appears down (5+ consecutive failures). '
                'Robot will not respond to new commands until this recovers. '
                'Try: systemctl status arduino-router / journalctl -u arduino-router -f'
            )

    def poll_stm32(self):
        # 1. Send pending commands first (max 1 socket open per cycle)
        if self.pending_cmd_vel:
            try:
                result = rpc_call('set_cmd_vel', self.pending_cmd_vel)
                if result is None:
                    self._note_failure('set_cmd_vel')
                else:
                    self.pending_cmd_vel = None
                    self._note_success()
            except Exception as e:
                self._note_failure(f'set_cmd_vel raised {e!r}')

        if self.pending_position:
            try:
                result = rpc_call('set_target_position', self.pending_position)
                if result is None:
                    self._note_failure('set_target_position')
                else:
                    self.pending_position = None
                    self._note_success()
            except Exception as e:
                self._note_failure(f'set_target_position raised {e!r}')

        # 2. Get State
        try:
            state_str = rpc_call('get_robot_state')
            if not state_str:
                self._note_failure('get_robot_state (empty/None response)')
                return

            if isinstance(state_str, bytes):
                state_str = state_str.decode('utf-8')

            if state_str:
                state = [float(x) for x in state_str.split(',')]
                self.pub_ticks_l.publish(Int32(data=int(state[0])))
                self.pub_ticks_r.publish(Int32(data=int(state[1])))
                self.pub_actual_l.publish(Float32(data=state[2]))
                self.pub_actual_r.publish(Float32(data=state[3]))
                self.pub_target_l.publish(Float32(data=state[4]))
                self.pub_target_r.publish(Float32(data=state[5]))
                if len(state) >= 7:
                    self.pub_battery.publish(Float32(data=state[6]))
                self._note_success()
        except Exception as e:
            self._note_failure(f'get_robot_state raised {e!r}')


def main(args=None):
    rclpy.init(args=args)
    node = RobotHardwareNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
