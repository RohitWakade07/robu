from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.services.map_service import MapService

router = APIRouter(prefix="/map", tags=["Warehouse Map"])


class MapUpload(BaseModel):
    label: str
    pgm_data: str
    resolution: float
    origin_x: float
    origin_y: float
    width_px: int
    height_px: int


class MapResponse(BaseModel):
    id: str
    label: str
    pgm_data: str | None
    resolution: float
    origin_x: float
    origin_y: float
    width_px: int
    height_px: int
    zones_synced: bool
    is_active: bool


@router.get("/current", response_model=MapResponse)
async def get_current_map(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMINISTRATOR, UserRole.WAREHOUSE_OPERATOR))],
):
    service = MapService(db)
    current_map = await service.get_current_map()
    if not current_map:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active map found")
    return current_map


@router.post("/upload", response_model=MapResponse, status_code=status.HTTP_201_CREATED)
async def upload_map(
    data: MapUpload,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.SYSTEM, UserRole.ADMINISTRATOR))],
):
    service = MapService(db)
    return await service.upload_map(
        label=data.label,
        pgm_data=data.pgm_data,
        resolution=data.resolution,
        origin_x=data.origin_x,
        origin_y=data.origin_y,
        width_px=data.width_px,
        height_px=data.height_px,
    )


@router.post("/{map_id}/sync-warehouse", status_code=status.HTTP_200_OK)
async def sync_warehouse_zones(
    map_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMINISTRATOR))],
):
    service = MapService(db)
    try:
        return await service.sync_warehouse(map_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
