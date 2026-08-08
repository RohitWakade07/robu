from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None


class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit_price: float = 0.0
    weight_kg: Optional[float] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit_price: float
    weight_kg: Optional[float] = None
    created_at: datetime


class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    shelf_id: Optional[str] = None
    quantity: int
    reserved_quantity: int
    available_quantity: int = 0
    aruco_marker_id: Optional[int] = None
    last_verified_at: Optional[str] = None


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    quantity: int
    unit_price: float


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_number: str
    customer_id: str
    status: str
    total_amount: float
    assigned_robot_id: Optional[str] = None
    task_id: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
