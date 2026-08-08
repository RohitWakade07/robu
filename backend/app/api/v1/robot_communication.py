import os
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.db.session import get_db
from app.models.task import RobotTask, RobotEvent, TaskExecutionHistory
from app.models.robot import Robot
from app.schemas.robot_communication import (
    CanonicalEnvelope,
    TaskSubmitRequest,
    RobotCommunicationHealthResponse
)

router = APIRouter(prefix="/robot-communication", tags=["ROS 2 Robot Communication Pipeline"])

# ROS Bridge Host URL (defaults to robot IP 192.168.1.12:8005)
ROS_BRIDGE_URL = os.environ.get("ROS_BRIDGE_URL", "http://192.168.1.12:8005")


async def proxy_ros_request(method: str, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{ROS_BRIDGE_URL}{endpoint}"
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            if method == "POST":
                resp = await client.post(url, json=payload)
            else:
                resp = await client.get(url)
            
            if resp.status_code in [200, 201, 202]:
                return resp.json()
            elif resp.status_code == 404:
                # Legacy bridge compatibility fallback
                if "/health" in endpoint:
                    leg_res = await client.get(f"{ROS_BRIDGE_URL}/health")
                    if leg_res.status_code == 200:
                        return {"status": "healthy", "ros_initialized": True, "active_robots": 1, "pending_tasks": 0, "started_at": None, "node_name": "wms_bridge_legacy"}
                elif "/tasks" in endpoint and method == "POST" and payload:
                    pick_id = 1
                    place_id = 11
                    src = payload.get("payload", {}).get("source_location", {}).get("location_id") or ""
                    dst = payload.get("payload", {}).get("destination_location", {}).get("location_id") or ""
                    try:
                        pick_id = int(''.join(filter(str.isdigit, str(src))) or '1')
                        place_id = int(''.join(filter(str.isdigit, str(dst))) or '11')
                    except Exception:
                        pass
                    leg_order = await client.post(f"{ROS_BRIDGE_URL}/order", json={"pick_id": pick_id, "place_id": place_id})
                    if leg_order.status_code in [200, 201, 202]:
                        return leg_order.json()
                elif "/robots" in endpoint and method == "GET":
                    leg_stat = await client.get(f"{ROS_BRIDGE_URL}/status")
                    if leg_stat.status_code == 200:
                        return [{"robot_id": "armsbot-01", "status": leg_stat.json().get("status", "IDLE"), "battery": 98.0, "position": {"x": 3.0, "y": 0.0, "yaw": 0.0}}]
                elif "/events" in endpoint and method == "GET":
                    return []
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            else:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
        except httpx.RequestError as exc:
            # Fallback for offline ROS Bridge in simulation mode
            return {"status": "simulated_offline", "detail": f"ROS Bridge unreachable at {url}: {exc}"}


@router.post("/tasks", status_code=status.HTTP_202_ACCEPTED)
async def submit_robot_task(
    req: TaskSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a new robot task with Canonical JSON Envelope & persist in SQL database.
    """
    task_id = str(uuid.uuid4())
    msg_id = str(uuid.uuid4())

    envelope = CanonicalEnvelope(
        message_id=msg_id,
        message_type="TASK_CREATE",
        task_id=task_id,
        robot_id=req.robot_id,
        priority=req.priority,
        payload={
            "task_type": req.task_type,
            "order_id": req.order_id,
            "product_id": req.product_id,
            "quantity": req.quantity,
            "source_location": {
                "location_id": req.source_location_id,
                "location_type": "rack_slot",
                "slot_id": req.source_location_id
            },
            "destination_location": {
                "location_id": req.destination_location_id,
                "location_type": "shipping_zone",
                "slot_id": req.destination_location_id
            }
        }
    )

    # Persist in WMS SQL Database
    db_task = RobotTask(
        id=task_id,
        task_type=req.task_type,
        status="QUEUED",
        priority=req.priority,
        robot_id=req.robot_id,
        reference_type="order" if req.order_id else None,
        reference_id=req.order_id,
        payload=json.dumps(envelope.model_dump()),
        product_id=req.product_id
    )
    db.add(db_task)
    await db.commit()

    # Forward to ROS 2 WMS Bridge
    ros_res = await proxy_ros_request("POST", "/api/v1/robot-communication/tasks", envelope.model_dump())
    
    return {
        "status": "submitted",
        "task_id": task_id,
        "message_id": msg_id,
        "ros_bridge_response": ros_res
    }


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    # Try fetching from DB first
    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()

    ros_status = await proxy_ros_request("GET", f"/api/v1/robot-communication/tasks/{task_id}")

    if not db_task and "detail" in ros_status:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task_id,
        "status": ros_status.get("status") or (db_task.status if db_task else "UNKNOWN"),
        "priority": db_task.priority if db_task else 10,
        "ros_bridge_state": ros_status
    }


@router.post("/tasks/{task_id}/cancel")
async def cancel_robot_task(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()
    if db_task:
        db_task.status = "CANCELLED"
        await db.commit()

    return await proxy_ros_request("POST", f"/api/v1/robot-communication/tasks/{task_id}/cancel")


@router.post("/tasks/{task_id}/pause")
async def pause_robot_task(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()
    if db_task:
        db_task.status = "PAUSED"
        await db.commit()

    return await proxy_ros_request("POST", f"/api/v1/robot-communication/tasks/{task_id}/pause")


@router.post("/tasks/{task_id}/resume")
async def resume_robot_task(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()
    if db_task:
        db_task.status = "STARTED"
        await db.commit()

    return await proxy_ros_request("POST", f"/api/v1/robot-communication/tasks/{task_id}/resume")


@router.get("/robots")
async def list_robots(db: AsyncSession = Depends(get_db)):
    ros_bots = await proxy_ros_request("GET", "/api/v1/robot-communication/robots")
    if isinstance(ros_bots, list):
        return ros_bots

    # Fallback to database robots if ROS bridge is not running
    result = await db.execute(select(Robot))
    bots = result.scalars().all()
    return [
        {
            "robot_id": b.id,
            "status": b.status,
            "battery": b.battery_level,
            "position": {"x": b.position_x or 0.0, "y": b.position_y or 0.0, "yaw": b.orientation_z or 0.0},
            "current_task_id": b.current_task_id,
            "last_seen": b.updated_at.isoformat() if b.updated_at else None
        }
        for b in bots
    ]


@router.get("/robots/{robot_id}")
async def get_robot_state(robot_id: str):
    return await proxy_ros_request("GET", f"/api/v1/robot-communication/robots/{robot_id}")


@router.get("/events")
async def list_recent_events():
    return await proxy_ros_request("GET", "/api/v1/robot-communication/events")


from fastapi.responses import StreamingResponse

@router.get("/video_feed")
async def get_robot_video_feed():
    """
    Proxy Live MJPEG Camera Feed from Robot ROS Bridge to WMS Frontend.
    """
    async def stream_generator():
        url = f"{ROS_BRIDGE_URL}/video_feed"
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream("GET", url) as response:
                    async for chunk in response.aiter_bytes():
                        yield chunk
            except Exception:
                yield b""

    return StreamingResponse(
        stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/health")
async def check_communication_health():
    res = await proxy_ros_request("GET", "/api/v1/robot-communication/health")
    if res.get("status") == "simulated_offline":
        return {
            "status": "simulated_offline",
            "ros_initialized": False,
            "active_robots": 1,
            "pending_tasks": 0,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "node_name": "wms_bridge_proxy"
        }
    return res
