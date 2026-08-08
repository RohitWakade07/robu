from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ShipmentItemCreate(BaseModel):
    product_id: Optional[str] = None
    expected_quantity: int = Field(default=1, gt=0)
    aruco_marker_id: Optional[int] = None
    crate_label: Optional[str] = None


class ShipmentCreate(BaseModel):
    items: List[ShipmentItemCreate]
    notes: Optional[str] = None


class ShipmentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: Optional[str] = None
    expected_quantity: int
    aruco_marker_id: Optional[int] = None
    crate_label: Optional[str] = None
    status: str


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    shipment_number: str
    operator_id: str
    status: str
    assigned_robot_id: Optional[str] = None
    task_id: Optional[str] = None
    items: List[ShipmentItemResponse] = []
    created_at: datetime
