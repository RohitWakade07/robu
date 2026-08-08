#!/usr/bin/env python3
"""
Production Bidirectional JSON Communication WMS Bridge Node.
Bridges FastAPI REST HTTP API <--> ROS 2 Topics (/wms/commands, /wms/events, /wms/status, /wms/telemetry).
"""

import json
import os
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String
    RCLPY_AVAILABLE = True
except ImportError:
    RCLPY_AVAILABLE = False
    class String:
        def __init__(self, data: str = ""): self.data = data
    class Node:
        def __init__(self, name): pass
        def create_publisher(self, *args): return self
        def create_subscription(self, *args): return self
        def publish(self, msg): pass
        def get_logger(self):
            class Logger:
                def info(self, m): print(f"[INFO] {m}")
                def error(self, m): print(f"[ERROR] {m}")
                def warn(self, m): print(f"[WARN] {m}")
            return Logger()



from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure schemas module is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from schemas import (
    CanonicalEnvelope,
    TaskPayload,
    LocationSchema,
    RobotStatusEnvelope,
    ErrorPayload
)

app = FastAPI(
    title="ROS 2 WMS Communication Bridge API",
    version="2.0.0",
    description="Bidirectional JSON Communication Pipeline between WMS and ROS 2 Fleet Controller"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global ROS 2 node reference
ros_node: Optional["WMSBridgeNode"] = None


class WMSBridgeNode(Node):
    def __init__(self):
        super().__init__("wms_bridge")

        # --- ROS 2 Publishers ---
        self.pub_commands = self.create_publisher(String, "/wms/commands", 10)
        self.pub_order_legacy = self.create_publisher(String, "/wms_order", 10)

        # --- ROS 2 Subscriptions ---
        self.sub_events = self.create_subscription(String, "/wms/events", self.events_callback, 10)
        self.sub_status = self.create_subscription(String, "/wms/status", self.status_callback, 10)
        self.sub_telemetry = self.create_subscription(String, "/wms/telemetry", self.telemetry_callback, 10)
        self.sub_status_legacy = self.create_subscription(String, "/wms_status", self.legacy_status_callback, 10)

        # In-Memory State Caches
        self.processed_message_ids = set()
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.robots: Dict[str, Dict[str, Any]] = {
            "armsbot-01": {
                "robot_id": "armsbot-01",
                "status": "IDLE",
                "battery": 98.5,
                "position": {"x": 3.0, "y": 0.0, "yaw": 0.0},
                "current_task_id": None,
                "last_seen": datetime.now(timezone.utc).isoformat()
            }
        }
        self.recent_events: List[Dict[str, Any]] = []
        self.last_status_msg = "IDLE"
        self.started_at = datetime.now(timezone.utc).isoformat()

        self.get_logger().info("[OK] Production WMS Bridge Node Initialized on /wms/commands & /wms/events")

    # --- Callbacks ---
    def events_callback(self, msg: String):
        try:
            data = json.loads(msg.data)
            msg_id = data.get("message_id")
            if msg_id in self.processed_message_ids:
                return  # Idempotency check
            if msg_id:
                self.processed_message_ids.add(msg_id)

            msg_type = data.get("message_type")
            task_id = data.get("task_id")
            robot_id = data.get("robot_id") or "armsbot-01"

            # Update event history log
            self.recent_events.insert(0, data)
            if len(self.recent_events) > 100:
                self.recent_events.pop()

            # Update Task Lifecycle State
            if task_id and task_id in self.tasks:
                task = self.tasks[task_id]
                task["status"] = msg_type
                task["updated_at"] = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

                if msg_type in ["TASK_COMPLETED", "TASK_FINISHED"]:
                    task["status"] = "COMPLETED"
                    task["completed_at"] = task["updated_at"]
                elif msg_type in ["TASK_FAILED", "ERROR"]:
                    task["status"] = "FAILED"
                    task["failed_at"] = task["updated_at"]
                    task["error_message"] = data.get("payload", {}).get("error_message") or "Task execution error"
                elif msg_type == "TASK_CANCELLED":
                    task["status"] = "CANCELLED"

            # Update Robot State
            if robot_id in self.robots:
                bot = self.robots[robot_id]
                bot["last_seen"] = datetime.now(timezone.utc).isoformat()
                if task_id:
                    bot["current_task_id"] = task_id
                if msg_type in ["TASK_COMPLETED", "TASK_FAILED", "TASK_CANCELLED"]:
                    bot["current_task_id"] = None
                    bot["status"] = "IDLE"
                elif msg_type in ["NAVIGATING_TO_PICK", "NAVIGATING_TO_PLACE"]:
                    bot["status"] = "NAVIGATING"
                elif msg_type in ["PICKING", "PLACING"]:
                    bot["status"] = "PICKING" if msg_type == "PICKING" else "PLACING"

            self.get_logger().info(f"📩 Event Received: {msg_type} | Task: {task_id}")
        except Exception as e:
            self.get_logger().error(f"Failed to parse event JSON: {e}")

    def status_callback(self, msg: String):
        try:
            data = json.loads(msg.data)
            robot_id = data.get("robot_id", "armsbot-01")
            self.robots[robot_id] = {
                "robot_id": robot_id,
                "status": data.get("status", "IDLE"),
                "battery": data.get("battery", 100.0),
                "position": data.get("position", {"x": 0.0, "y": 0.0, "yaw": 0.0}),
                "current_task_id": data.get("current_task_id"),
                "last_seen": data.get("timestamp", datetime.now(timezone.utc).isoformat())
            }
        except json.JSONDecodeError:
            self.last_status_msg = msg.data

    def telemetry_callback(self, msg: String):
        try:
            data = json.loads(msg.data)
            robot_id = data.get("robot_id", "armsbot-01")
            if robot_id in self.robots:
                if "battery" in data:
                    self.robots[robot_id]["battery"] = data["battery"]
                if "x" in data and "y" in data:
                    self.robots[robot_id]["position"] = {"x": data["x"], "y": data["y"], "yaw": data.get("yaw", 0.0)}
                self.robots[robot_id]["last_seen"] = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            self.get_logger().error(f"Telemetry error: {e}")

    def legacy_status_callback(self, msg: String):
        self.last_status_msg = msg.data

    # --- Commands Publisher Helper ---
    def publish_envelope(self, envelope: CanonicalEnvelope) -> Dict[str, Any]:
        if envelope.message_id in self.processed_message_ids:
            return {"status": "ignored", "reason": "duplicate_message_id", "message_id": envelope.message_id}

        self.processed_message_ids.add(envelope.message_id)

        # Record task in local state
        self.tasks[envelope.task_id] = {
            "task_id": envelope.task_id,
            "message_id": envelope.message_id,
            "status": "QUEUED",
            "priority": envelope.priority,
            "robot_id": envelope.robot_id,
            "payload": envelope.payload,
            "created_at": envelope.timestamp,
            "updated_at": envelope.timestamp,
        }

        # Publish Canonical JSON Envelope to ROS
        msg = String()
        msg.data = json.dumps(envelope.model_dump())
        self.pub_commands.publish(msg)

        # Legacy backward compatibility bridge fallback
        legacy_payload = envelope.payload
        pick_id = legacy_payload.get("source_location", {}).get("slot_id") or legacy_payload.get("source_location", {}).get("location_id")
        place_id = legacy_payload.get("destination_location", {}).get("slot_id") or legacy_payload.get("destination_location", {}).get("location_id")
        if pick_id and place_id:
            try:
                legacy_msg = String()
                legacy_msg.data = json.dumps({"pick_id": int(str(pick_id).replace("RACK-", "").replace("SLOT-", "")), "place_id": int(str(place_id).replace("SHIP-", "").replace("SLOT-", ""))})
                self.pub_order_legacy.publish(legacy_msg)
            except ValueError:
                pass

        self.get_logger().info(f"[CMD] Command Published: {envelope.message_type} | Task ID: {envelope.task_id}")
        return {"status": "accepted", "task_id": envelope.task_id, "message_id": envelope.message_id}


# --- REST API Endpoints under /api/v1/robot-communication ---

@app.post("/api/v1/robot-communication/tasks", status_code=status.HTTP_202_ACCEPTED)
def submit_task(envelope: CanonicalEnvelope):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    return ros_node.publish_envelope(envelope)


@app.get("/api/v1/robot-communication/tasks/{task_id}")
def get_task_status(task_id: str):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    if task_id not in ros_node.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return ros_node.tasks[task_id]


@app.post("/api/v1/robot-communication/tasks/{task_id}/cancel")
def cancel_task(task_id: str):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    envelope = CanonicalEnvelope(
        message_type="TASK_CANCEL",
        task_id=task_id,
        payload={"reason": "User requested cancellation"}
    )
    return ros_node.publish_envelope(envelope)


@app.post("/api/v1/robot-communication/tasks/{task_id}/pause")
def pause_task(task_id: str):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    envelope = CanonicalEnvelope(
        message_type="TASK_PAUSE",
        task_id=task_id,
        payload={"reason": "User requested pause"}
    )
    return ros_node.publish_envelope(envelope)


@app.post("/api/v1/robot-communication/tasks/{task_id}/resume")
def resume_task(task_id: str):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    envelope = CanonicalEnvelope(
        message_type="TASK_RESUME",
        task_id=task_id,
        payload={"reason": "User requested resume"}
    )
    return ros_node.publish_envelope(envelope)


@app.get("/api/v1/robot-communication/robots")
def list_robots():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    return list(ros_node.robots.values())


@app.get("/api/v1/robot-communication/robots/{robot_id}")
def get_robot_state(robot_id: str):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    if robot_id not in ros_node.robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    return ros_node.robots[robot_id]


@app.get("/api/v1/robot-communication/events")
def list_recent_events():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    return ros_node.recent_events


latest_frame_bytes: Optional[bytes] = None


@app.get("/video_feed")
@app.get("/api/v1/robot-communication/video_feed")
def get_video_feed():
    """
    Live MJPEG Camera Video Stream Endpoint for WMS Dashboard.
    """
    def generate_mjpeg():
        while True:
            if latest_frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame_bytes + b'\r\n')
            else:
                # Placeholder frame when camera is idle
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + b'' + b'\r\n')
            time.sleep(0.04)

    return StreamingResponse(
        generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/v1/robot-communication/health")
def check_bridge_health():
    is_ready = ros_node is not None
    return {
        "status": "healthy" if is_ready else "degraded",
        "ros_initialized": RCLPY_AVAILABLE and rclpy.ok() if is_ready else False,
        "active_robots": len(ros_node.robots) if is_ready else 0,
        "pending_tasks": len([t for t in ros_node.tasks.values() if t["status"] in ["QUEUED", "STARTED", "NAVIGATING_TO_PICK"]]) if is_ready else 0,
        "started_at": ros_node.started_at if is_ready else None,
        "node_name": "wms_bridge"
    }


# --- Legacy Compatibility Endpoints ---

class LegacyOrderRequest(BaseModel):
    pick_id: int
    place_id: int


@app.post("/order")
def legacy_place_order(order: LegacyOrderRequest):
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")

    task_id = str(uuid.uuid4())
    envelope = CanonicalEnvelope(
        message_type="TASK_CREATE",
        task_id=task_id,
        payload={
            "task_type": "PICK_AND_PLACE",
            "quantity": 1,
            "source_location": {
                "location_id": f"RACK-{order.pick_id}",
                "location_type": "rack_slot",
                "slot_id": str(order.pick_id)
            },
            "destination_location": {
                "location_id": f"RACK-{order.place_id}",
                "location_type": "rack_slot",
                "slot_id": str(order.place_id)
            }
        }
    )
    ros_node.publish_envelope(envelope)
    return {"status": "Order accepted", "task_id": task_id, "pick_id": order.pick_id, "place_id": order.place_id}


@app.get("/status")
def legacy_get_status():
    if ros_node is None:
        raise HTTPException(status_code=500, detail="ROS 2 Bridge Node is offline")
    return {"status": ros_node.last_status_msg}


# --- Node Runner ---

def spin_ros(node):
    if RCLPY_AVAILABLE:
        rclpy.spin(node)


def main(args=None):
    global ros_node
    if RCLPY_AVAILABLE:
        rclpy.init(args=args)
    ros_node = WMSBridgeNode()

    # Spin ROS 2 in background daemon thread
    ros_thread = threading.Thread(target=spin_ros, args=(ros_node,), daemon=True)
    ros_thread.start()

    # Run FastAPI server
    port = int(os.environ.get("WMS_BRIDGE_PORT", "8005"))
    uvicorn_kwargs = {"host": "0.0.0.0", "port": port}
    
    import uvicorn
    uvicorn.run(app, **uvicorn_kwargs)

    if RCLPY_AVAILABLE:
        ros_node.destroy_node()
        rclpy.shutdown()



if __name__ == "__main__":
    main()
