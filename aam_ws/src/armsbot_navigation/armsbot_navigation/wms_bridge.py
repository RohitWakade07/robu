#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import threading
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="WMS Bridge API")

# Global reference to the ROS node
ros_node = None

class OrderRequest(BaseModel):
    pick_id: int
    place_id: int

class WMSBridgeNode(Node):
    def __init__(self):
        super().__init__("wms_bridge")
        self.pub_order = self.create_publisher(String, "/wms_order", 10)
        self.sub_status = self.create_subscription(String, "/wms_status", self.status_callback, 10)
        self.current_status = "IDLE"
        self.get_logger().info("WMS Bridge initialized. HTTP API running on port 8000.")

    def status_callback(self, msg):
        self.current_status = msg.data
        self.get_logger().info(f"Updated status from Task Manager: {self.current_status}")

    def send_order(self, pick_id, place_id):
        order = {"pick_id": pick_id, "place_id": place_id}
        msg = String()
        msg.data = json.dumps(order)
        self.pub_order.publish(msg)

@app.post("/order")
def place_order(order: OrderRequest):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS Node not running")
    
    ros_node.send_order(order.pick_id, order.place_id)
    return {"status": "Order accepted", "pick_id": order.pick_id, "place_id": order.place_id}

@app.get("/status")
def get_status():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS Node not running")
    return {"status": ros_node.current_status}

def run_ros_spin(node):
    rclpy.spin(node)

def main(args=None):
    global ros_node
    rclpy.init(args=args)
    ros_node = WMSBridgeNode()
    
    # Spin ROS 2 in a background thread
    ros_thread = threading.Thread(target=run_ros_spin, args=(ros_node,), daemon=True)
    ros_thread.start()
    
    # Run FastAPI (blocking on main thread)
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    # Shutdown
    ros_node.destroy_node()
    rclpy.shutdown()

if __name__ == "__main__":
    main()
