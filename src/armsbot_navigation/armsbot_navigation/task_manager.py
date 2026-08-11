#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.parameter import Parameter
from nav2_msgs.action import NavigateToPose
from geometry_msgs.msg import PoseStamped
from std_msgs.msg import String, Float32
import math
import subprocess
import json
import threading
from queue import PriorityQueue
import time
import os
import re

# --- WAREHOUSE MAP ---
RACK_LOCATIONS = {
    1: (1.09, 1.5, 1.57),      
    2: (1.35, 1.5, 1.57),     
    3: (1.63, 1.5, 1.57),     
    4: (1.91, 1.5, 1.57),   
    11: (3.6, 0.41, 0.0),     
    12: (3.6, 0.13, 0.0)     
}
HOME_LOCATION = (3.0, 0.0, 0.0)
ROBOT_ID = os.getenv("ROBOT_ID", "armsbot-01")

class WarehouseTaskManager(Node):
    def __init__(self):
        super().__init__(
            "warehouse_task_manager",
            parameter_overrides=[Parameter("use_sim_time", Parameter.Type.BOOL, os.getenv("USE_SIM_TIME", "false").lower() == "true")]
        )
        self.nav_client = ActionClient(self, NavigateToPose, "navigate_to_pose")
        
        self.pub_events = self.create_publisher(String, "/wms/events", 10)
        self.pub_status = self.create_publisher(String, "/wms/status", 10)
        self.pub_telemetry = self.create_publisher(String, "/wms/telemetry", 10)
        self.sub_commands = self.create_subscription(String, "/wms/commands", self.command_callback, 10)
        self.sub_battery = self.create_subscription(Float32, "/battery", self.battery_callback, 10)
        
        self.task_queue = PriorityQueue()
        self.is_executing = False
        
        self.battery_level = 100.0
        self.low_battery_triggered = False
        
        # Telemetry timer (publish every 2 seconds)
        self.create_timer(2.0, self.publish_telemetry)
        
        # Execution loop timer
        self.create_timer(1.0, self.process_queue)
        
        self.current_state = "IDLE"
        self.current_task_id = None
        self.publish_status()
        self.get_logger().info("Task Manager Initialized. Waiting for tasks on /wms/commands.")

    def parse_id(self, location_str):
        # Extracts numbers from strings like 'RACK-1' -> 1
        matches = re.findall(r'\d+', location_str)
        if matches:
            return int(matches[0])
        return 0

    def command_callback(self, msg):
        try:
            command = json.loads(msg.data)
            if command.get("message_type") == "TASK_CREATE":
                # priority inversion: smaller number is higher priority in python's PriorityQueue
                # So we use negative priority or just assume smaller number = higher priority
                # The spec says "priority": 5. We'll use (100 - priority) to make higher numbers run first.
                priority = command.get("priority", 0)
                q_priority = 100 - priority 
                
                self.task_queue.put((q_priority, command))
                self.publish_event(command.get("task_id"), "TASK_QUEUED")
                self.get_logger().info(f"Queued task: {command.get('task_id')} with priority {priority}")
        except json.JSONDecodeError:
            self.get_logger().error("Invalid JSON command received.")

    def battery_callback(self, msg):
        self.battery_level = msg.data
        if self.battery_level < 15.0 and not self.low_battery_triggered:
            self.low_battery_triggered = True
            self.publish_event(self.current_task_id, "LOW_BATTERY")
            self.get_logger().warn(f"LOW BATTERY DETECTED: {self.battery_level}%")
        elif self.battery_level >= 15.0:
            self.low_battery_triggered = False

    def publish_event(self, task_id, state):
        self.current_state = state
        event = {
            "message_id": f"evt-{int(time.time()*1000)}",
            "message_type": state,
            "timestamp": int(time.time()),
            "source": "ROS2",
            "task_id": task_id,
            "robot_id": ROBOT_ID,
            "payload": {}
        }
        msg = String()
        msg.data = json.dumps(event)
        self.pub_events.publish(msg)
        self.publish_status()

    def publish_status(self):
        status = {
            "robot_id": ROBOT_ID,
            "status": self.current_state,
            "battery": self.battery_level,
            "position": {"x": 0.0, "y": 0.0, "yaw": 0.0},
            "current_task_id": self.current_task_id,
            "timestamp": int(time.time())
        }
        msg = String()
        msg.data = json.dumps(status)
        self.pub_status.publish(msg)
        
    def publish_telemetry(self):
        # We use dummy coordinates for now as requested.
        telemetry = {
            "robot_id": ROBOT_ID,
            "battery": self.battery_level,
            "x": 0.0,
            "y": 0.0,
            "yaw": 0.0,
            "timestamp": int(time.time())
        }
        msg = String()
        msg.data = json.dumps(telemetry)
        self.pub_telemetry.publish(msg)

    def process_queue(self):
        if self.is_executing or self.task_queue.empty():
            return
            
        self.is_executing = True
        _, task = self.task_queue.get()
        self.execute_mission(task)
        self.is_executing = False

    def execute_mission(self, task):
        task_id = task.get("task_id")
        self.current_task_id = task_id
        
        self.publish_event(task_id, "TASK_ACCEPTED")
        self.publish_event(task_id, "TASK_STARTED")
        
        try:
            payload = task.get("payload", {})
            src = payload.get("source_location", {}).get("location_id", "")
            dst = payload.get("destination_location", {}).get("location_id", "")
            
            pick_id = self.parse_id(src)
            place_id = self.parse_id(dst)
            
            if pick_id not in RACK_LOCATIONS or place_id not in RACK_LOCATIONS:
                self.get_logger().error(f"Invalid rack locations extracted: {pick_id}, {place_id}")
                self.publish_event(task_id, "TASK_FAILED")
                self.current_task_id = None
                return

            if not self.nav_client.wait_for_server(timeout_sec=5.0):
                self.get_logger().error("Nav2 Action Server not available!")
                self.publish_event(task_id, "TASK_FAILED")
                self.current_task_id = None
                return

            # PICK
            self.publish_event(task_id, "NAVIGATING_TO_PICK")
            self.send_nav_goal(RACK_LOCATIONS[pick_id])
            self.publish_event(task_id, "ARRIVED_AT_PICK")
            
            self.publish_event(task_id, "PICKING")
            self.run_picknplace_script(pick_id)
            self.publish_event(task_id, "PICK_COMPLETED")

            # PLACE
            self.publish_event(task_id, "NAVIGATING_TO_PLACE")
            self.send_nav_goal(RACK_LOCATIONS[place_id])
            self.publish_event(task_id, "ARRIVED_AT_PLACE")

            self.publish_event(task_id, "PLACING")
            self.run_picknplace_script(place_id)
            self.publish_event(task_id, "PLACE_COMPLETED")

            # HOME
            self.publish_event(task_id, "RETURNING_HOME")
            self.send_nav_goal(HOME_LOCATION)
            
            self.publish_event(task_id, "TASK_COMPLETED")
            
        except Exception as e:
            self.get_logger().error(f"Mission failed: {e}")
            self.publish_event(task_id, "TASK_FAILED")
            
        self.current_state = "IDLE"
        self.current_task_id = None
        self.publish_status()

    def send_nav_goal(self, coords):
        x, y, yaw = coords
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose = PoseStamped()
        goal_msg.pose.header.frame_id = "map"
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        goal_msg.pose.pose.position.x = float(x)
        goal_msg.pose.pose.position.y = float(y)
        goal_msg.pose.pose.position.z = 0.0

        cy = math.cos(yaw * 0.5)
        sy = math.sin(yaw * 0.5)
        goal_msg.pose.pose.orientation.z = sy
        goal_msg.pose.pose.orientation.w = cy

        future = self.nav_client.send_goal_async(goal_msg)
        rclpy.spin_until_future_complete(self, future)
        goal_handle = future.result()

        if not goal_handle.accepted:
            self.get_logger().error("Nav2 goal rejected!")
            return

        result_future = goal_handle.get_result_async()
        rclpy.spin_until_future_complete(self, result_future)

    def run_picknplace_script(self, target_id):
        try:
            subprocess.run(
                ['ros2', 'run', 'armsbot_navigation', 'picknplace', str(target_id), '--ros-args', '-p', 'use_sim_time:=false'], 
                check=True
            )
        except subprocess.CalledProcessError as e:
            self.get_logger().error(f"picknplace failed: {e}")

def main(args=None):
    rclpy.init(args=args)
    manager = WarehouseTaskManager()
    # Use MultiThreadedExecutor if queue/timers need parallel spin, but single is fine here since queue processing is non-blocking except for nav
    try:
        rclpy.spin(manager)
    except KeyboardInterrupt:
        pass
    finally:
        manager.destroy_node()
        rclpy.shutdown()

if __name__ == "__main__":
    main()