#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.parameter import Parameter
from nav2_msgs.action import NavigateToPose
from geometry_msgs.msg import PoseStamped
from std_msgs.msg import String
import math
import sys
import subprocess
import os
import json

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

class WarehouseTaskManager(Node):
    def __init__(self):
        super().__init__(
            "warehouse_task_manager",
            parameter_overrides=[Parameter("use_sim_time", Parameter.Type.BOOL, True)]
        )
        self.nav_client = ActionClient(self, NavigateToPose, "navigate_to_pose")
        
        # WMS Communication
        self.pub_status = self.create_publisher(String, "/wms_status", 10)
        self.sub_order = self.create_subscription(String, "/wms_order", self.order_callback, 10)
        
        self.is_executing = False
        self.update_status("IDLE")
        
        self.get_logger().info("Warehouse Task Manager initialized. Waiting for WMS orders...")
        
    def update_status(self, status_str):
        self.get_logger().info(f"STATUS UPDATE: {status_str}")
        msg = String()
        msg.data = status_str
        self.pub_status.publish(msg)

    def order_callback(self, msg):
        if self.is_executing:
            self.get_logger().warn("Already executing a mission. Ignoring new order.")
            return
            
        try:
            order = json.loads(msg.data)
            pick_id = order.get("pick_id")
            place_id = order.get("place_id")
        except json.JSONDecodeError:
            self.get_logger().error("Invalid order JSON format.")
            return

        if pick_id not in RACK_LOCATIONS or place_id not in RACK_LOCATIONS:
            self.get_logger().error("Invalid ID entered. Check RACK_LOCATIONS.")
            return

        # Wait for Nav2 if not ready
        if not self.nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("Nav2 Action Server not available!")
            return

        # Start execution
        self.is_executing = True
        self.execute_mission(pick_id, place_id)
        self.is_executing = False
        self.update_status("IDLE")

    def execute_mission(self, pick_id, place_id):
        # PHASE 1: Navigate to Pick Location
        self.update_status(f"NAVIGATING_TO_PICK_{pick_id}")
        self.send_nav_goal(RACK_LOCATIONS[pick_id])
        
        # PHASE 2: Trigger Visual Servoing / Pick and Place
        self.update_status(f"PICKING_{pick_id}")
        self.run_picknplace_script(pick_id)

        # PHASE 3: Navigate to Place Location
        self.update_status(f"NAVIGATING_TO_PLACE_{place_id}")
        self.send_nav_goal(RACK_LOCATIONS[place_id])

        # PHASE 4: Trigger Visual Servoing / Drop off
        self.update_status(f"PLACING_{place_id}")
        self.run_picknplace_script(place_id)

        # PHASE 5: Return Home
        self.update_status("RETURNING_HOME")
        self.send_nav_goal(HOME_LOCATION)
        
        self.update_status("MISSION_COMPLETE")
        self.get_logger().info("🎉 MISSION COMPLETE! 🎉")

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
        
        if result_future.result().status == 4:
            self.get_logger().info("Reached target successfully.")
        else:
            self.get_logger().warn("Failed to reach target.")

    def run_picknplace_script(self, target_id):
        """Pauses ROS spinning and runs picknplace synchronously"""
        try:
            subprocess.run(
                ['ros2', 'run', 'armsbot_navigation', 'picknplace', str(target_id), '--ros-args', '-p', 'use_sim_time:=true'], 
                check=True
            )
        except subprocess.CalledProcessError as e:
            self.get_logger().error(f"picknplace node failed: {e}")
        except KeyboardInterrupt:
            self.get_logger().info("Mission aborted by user.")

def main(args=None):
    rclpy.init(args=args)
    manager = WarehouseTaskManager()
    try:
        rclpy.spin(manager)
    except KeyboardInterrupt:
        pass
    finally:
        manager.destroy_node()
        rclpy.shutdown()

if __name__ == "__main__":
    main()