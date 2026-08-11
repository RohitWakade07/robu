#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import threading
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
import uvicorn
import os
import cv2
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import asyncio
import os

WMS_BACKEND_URL = os.getenv("WMS_BACKEND_URL", "http://127.0.0.1:8000/api/v1")
WMS_BRIDGE_PORT = int(os.getenv("WMS_BRIDGE_PORT", "8005"))

app = FastAPI(title="WMS Bridge API")

# Global reference to the ROS node
ros_node = None

class WMSBridgeNode(Node):
    def __init__(self):
        super().__init__("wms_bridge")
        self.pub_commands = self.create_publisher(String, "/wms/commands", 10)
        
        self.sub_events = self.create_subscription(String, "/wms/events", self.events_callback, 10)
        self.sub_status = self.create_subscription(String, "/wms/status", self.status_callback, 10)
        self.sub_telemetry = self.create_subscription(String, "/wms/telemetry", self.telemetry_callback, 10)
        self.sub_camera = self.create_subscription(Image, "/camera/image_raw", self.camera_callback, 10)
        
        self.cv_bridge = CvBridge()
        self.latest_frame = None
        self.frame_lock = threading.Lock()
        
        self.http_client = httpx.AsyncClient()
        self.get_logger().info(f"WMS Bridge initialized. HTTP API running on port {WMS_BRIDGE_PORT}.")
        
    def send_wms_command(self, payload):
        msg = String()
        msg.data = json.dumps(payload)
        self.pub_commands.publish(msg)
        self.get_logger().info(f"Published task to /wms/commands: {payload.get('task_id')}")

    def events_callback(self, msg):
        try:
            data = json.loads(msg.data)
            self.get_logger().info(f"Forwarding event to WMS: {data.get('message_type')}")
            # Fire and forget request to WMS backend
            threading.Thread(target=self._post_to_wms, args=(f"{WMS_BACKEND_URL}/events", data)).start()
        except json.JSONDecodeError:
            self.get_logger().error("Failed to parse event JSON")

    def status_callback(self, msg):
        try:
            data = json.loads(msg.data)
            threading.Thread(target=self._post_to_wms, args=(f"{WMS_BACKEND_URL}/status", data)).start()
        except json.JSONDecodeError:
            pass

    def telemetry_callback(self, msg):
        try:
            data = json.loads(msg.data)
            threading.Thread(target=self._post_to_wms, args=(f"{WMS_BACKEND_URL}/telemetry", data)).start()
        except json.JSONDecodeError:
            pass

    def camera_callback(self, msg):
        try:
            cv_image = self.cv_bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            ret, buffer = cv2.imencode('.jpg', cv_image)
            if ret:
                with self.frame_lock:
                    self.latest_frame = buffer.tobytes()
        except Exception as e:
            self.get_logger().error(f"Failed to process camera frame: {e}")

    def _post_to_wms(self, url, json_data):
        import requests
        try:
            requests.post(url, json=json_data, timeout=2.0)
        except requests.exceptions.RequestException as e:
            self.get_logger().debug(f"Failed to reach WMS backend: {e}")

@app.get("/api/v1/robot-communication/health")
def get_health():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS Node not running")
    return {"status": "ok", "service": "wms_bridge"}

@app.post("/api/v1/robot-communication/tasks")
async def receive_task(request: Request):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS Node not running")
    
    try:
        task_data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    
    ros_node.send_wms_command(task_data)
    return {"status": "Task accepted", "task_id": task_data.get("task_id")}

async def generate_mjpeg_stream():
    while True:
        if ros_node is None:
            await asyncio.sleep(0.1)
            continue
            
        with ros_node.frame_lock:
            frame = ros_node.latest_frame
            
        if frame is None:
            await asyncio.sleep(0.1)
            continue
            
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        # Limit to ~20 FPS to save CPU overhead
        await asyncio.sleep(0.05)

@app.get("/api/v1/robot-communication/video_feed")
@app.get("/video_feed")
async def video_feed():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS Node not running")
    return StreamingResponse(generate_mjpeg_stream(), media_type="multipart/x-mixed-replace; boundary=frame")

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
    uvicorn.run(app, host="0.0.0.0", port=WMS_BRIDGE_PORT)
    
    # Shutdown
    ros_node.destroy_node()
    rclpy.shutdown()

if __name__ == "__main__":
    main()
