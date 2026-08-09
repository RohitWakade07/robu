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


from app.models.order import CustomerOrder, OrderItem
from app.models.shipment import IncomingShipment, ShipmentItem
from app.models.inventory import InventoryItem
from app.core.enums import OrderStatus, ShipmentStatus, RobotStatus
from app.websocket.gateway import manager


async def sync_task_status_with_db(db: AsyncSession, task_id: str, new_status: str):
    """
    Unified Lifecycle Synchronization Engine.
    Syncs RobotTask status changes directly with PostgreSQL CustomerOrder, IncomingShipment, InventoryItem, and Robot models.
    """
    if not task_id or not new_status:
        return

    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()
    if not db_task:
        return

    clean_status = new_status.upper().replace("TASK_", "")
    db_task.status = clean_status

    if clean_status in ["COMPLETED", "FINISHED", "DELIVERED"]:
        db_task.completed_at = datetime.now(timezone.utc)

        # 1. Sync Order Status & Deduct Inventory Stock
        if db_task.reference_type == "order" and db_task.reference_id:
            ord_res = await db.execute(select(CustomerOrder).where(CustomerOrder.id == db_task.reference_id))
            order = ord_res.scalar_one_or_none()
            if order:
                order.status = OrderStatus.DELIVERED.value
                
                # Deduct fulfilled items from inventory
                items_res = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
                for item in items_res.scalars().all():
                    inv_res = await db.execute(select(InventoryItem).where(InventoryItem.product_id == item.product_id))
                    inv_item = inv_res.scalar_one_or_none()
                    if inv_item:
                        inv_item.quantity = max(0, inv_item.quantity - item.quantity)
                        inv_item.reserved_quantity = max(0, inv_item.reserved_quantity - item.quantity)

                await manager.broadcast("order_update", {"order_id": order.id, "status": order.status})
                await manager.broadcast("inventory_update", {"reason": "order_fulfillment", "order_id": order.id})

        # 2. Sync Incoming Shipment & Increment Inventory Stock
        elif db_task.reference_type == "shipment" and db_task.reference_id:
            shp_res = await db.execute(select(IncomingShipment).where(IncomingShipment.id == db_task.reference_id))
            shipment = shp_res.scalar_one_or_none()
            if shipment:
                shipment.status = ShipmentStatus.COMPLETED.value

                # Add received items to inventory
                items_res = await db.execute(select(ShipmentItem).where(ShipmentItem.shipment_id == shipment.id))
                for item in items_res.scalars().all():
                    if item.product_id:
                        inv_res = await db.execute(select(InventoryItem).where(InventoryItem.product_id == item.product_id))
                        inv_item = inv_res.scalar_one_or_none()
                        if inv_item:
                            inv_item.quantity += item.expected_quantity
                        else:
                            new_inv = InventoryItem(product_id=item.product_id, quantity=item.expected_quantity, reserved_quantity=0)
                            db.add(new_inv)

                await manager.broadcast("shipment_update", {"shipment_id": shipment.id, "status": shipment.status})
                await manager.broadcast("inventory_update", {"reason": "shipment_intake", "shipment_id": shipment.id})

        # 3. Free Robot Fleet State
        if db_task.robot_id:
            bot_res = await db.execute(select(Robot).where(Robot.id == db_task.robot_id))
            bot = bot_res.scalar_one_or_none()
            if bot:
                bot.status = RobotStatus.IDLE.value
                bot.current_task_id = None
                await manager.broadcast("robot_status", {"robot_id": bot.id, "status": bot.status})

    elif clean_status in ["STARTED", "NAVIGATING", "PICKING", "PLACING"]:
        if db_task.robot_id:
            bot_res = await db.execute(select(Robot).where(Robot.id == db_task.robot_id))
            bot = bot_res.scalar_one_or_none()
            if bot:
                bot.status = RobotStatus.NAVIGATING.value if "NAVIGAT" in clean_status else clean_status
                bot.current_task_id = task_id
                await manager.broadcast("robot_status", {"robot_id": bot.id, "status": bot.status})

    await db.commit()


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, db: AsyncSession = Depends(get_db)):
    # Try fetching from DB first
    result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
    db_task = result.scalar_one_or_none()

    ros_status = await proxy_ros_request("GET", f"/api/v1/robot-communication/tasks/{task_id}")

    if not db_task and "detail" in ros_status:
        raise HTTPException(status_code=404, detail="Task not found")

    live_status = ros_status.get("status") or (db_task.status if db_task else "UNKNOWN")
    if db_task and live_status != db_task.status:
        await sync_task_status_with_db(db, task_id, live_status)

    return {
        "task_id": task_id,
        "status": live_status,
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
    res = await proxy_ros_request("GET", "/api/v1/robot-communication/events")
    if isinstance(res, list):
        return res
    return []


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
