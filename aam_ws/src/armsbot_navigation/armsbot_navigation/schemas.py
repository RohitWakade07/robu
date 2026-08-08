from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import uuid


class LocationSchema(BaseModel):
    location_id: str
    location_type: str = "rack_slot"  # rack_slot | shipping_zone | receiving_zone | charging_zone | home
    rack_id: Optional[str] = None
    shelf_id: Optional[str] = None
    slot_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    yaw: Optional[float] = None


class TaskPayload(BaseModel):
    task_type: str = "PICK_AND_PLACE"  # PICK_AND_PLACE | PICK | PLACE | RELOCATE | INVENTORY_SCAN
    order_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = 1
    source_location: LocationSchema
    destination_location: LocationSchema
    inventory_id: Optional[str] = None
    slot_id: Optional[str] = None
    rack_id: Optional[str] = None
    shelf_id: Optional[str] = None
    priority: int = 10
    robot_id: Optional[str] = None
    deadline: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CanonicalEnvelope(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_type: str  # TASK_CREATE | TASK_CANCEL | TASK_PAUSE | TASK_RESUME | ROBOT_ASSIGN | ROBOT_RETURN_HOME | ...
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "wms"
    destination: str = "warehouse_robot"
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    robot_id: Optional[str] = None
    priority: int = 10
    payload: Dict[str, Any] = Field(default_factory=dict)


class RobotStatusEnvelope(BaseModel):
    robot_id: str
    status: str  # IDLE | BUSY | NAVIGATING | PICKING | PLACING | CHARGING | ERROR | EMERGENCY_STOP | OFFLINE
    battery: float = 100.0
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0, "yaw": 0.0})
    current_task_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ErrorPayload(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: Optional[str] = None
    robot_id: Optional[str] = "armsbot-01"
    error_code: str
    error_message: str
    component: str
    recoverable: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
