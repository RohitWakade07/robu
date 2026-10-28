from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.shipment import ShipmentCreate, ShipmentResponse
from app.services.shipment_service import ShipmentService
from app.models.inventory import InventoryItem
from pydantic import BaseModel

router = APIRouter(prefix="/shipments", tags=["Warehouse Intake"])


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    data: ShipmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE_OPERATOR, UserRole.ADMINISTRATOR))],
):
    service = ShipmentService(db)
    try:
        return await service.create_shipment(current_user.id, data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Conflict / constraint violation")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")


@router.get("", response_model=list[ShipmentResponse])
async def list_shipments(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE_OPERATOR, UserRole.ADMINISTRATOR))],
):
    service = ShipmentService(db)
    try:
        return await service.list_shipments()
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")


class InventoryResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    reserved_quantity: int
    shelf_id: str | None = None
    aruco_marker_id: int | None = None


@router.get("/inventory", response_model=list[InventoryResponse])
async def list_inventory(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE_OPERATOR, UserRole.ADMINISTRATOR))],
):
    from sqlalchemy import select
    result = await db.execute(select(InventoryItem))
    return [
        InventoryResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            reserved_quantity=item.reserved_quantity,
            shelf_id=item.shelf_id,
            aruco_marker_id=item.aruco_marker_id,
        )
        for item in result.scalars().all()
    ]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE_OPERATOR, UserRole.ADMINISTRATOR))],
):
    service = ShipmentService(db)
    try:
        shipment = await service.get_shipment(shipment_id)
        if not shipment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
        return shipment
    except HTTPException:
        raise
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")
