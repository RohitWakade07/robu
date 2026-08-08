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
    message_type: str  # TASK_CREATE | TASK_CANCEL | TASK_PAUSE | TASK_RESUME | ROBOT_ASSIGN | ROBOT_RETURN_HOME
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "wms"
    destination: str = "warehouse_robot"
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    robot_id: Optional[str] = None
    priority: int = 10
    payload: Dict[str, Any] = Field(default_factory=dict)


class TaskSubmitRequest(BaseModel):
    task_type: str = "PICK_AND_PLACE"
    order_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = 1
    source_location_id: str = "RACK-1"
    destination_location_id: str = "SHIP-11"
    priority: int = 10
    robot_id: Optional[str] = None


class RobotCommunicationHealthResponse(BaseModel):
    status: str
    ros_initialized: bool
    active_robots: int
    pending_tasks: int
    started_at: Optional[str] = None
    node_name: str
