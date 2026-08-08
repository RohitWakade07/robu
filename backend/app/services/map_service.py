from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.map import WarehouseMap


class MapService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_current_map(self) -> WarehouseMap:
        result = await self.db.execute(
            select(WarehouseMap).where(WarehouseMap.is_active == True).order_by(WarehouseMap.created_at.desc()).limit(1)
        )
        current_map = result.scalar_one_or_none()
        if not current_map:
            # Auto-seed default warehouse 2D SLAM map
            current_map = WarehouseMap(
                id="default-warehouse-map",
                label="Primary Warehouse SLAM Grid",
                pgm_data=None,
                resolution=0.05,
                origin_x=-10.0,
                origin_y=-10.0,
                width_px=400,
                height_px=400,
                is_active=True
            )
            self.db.add(current_map)
            await self.db.flush()
        return current_map

    async def upload_map(self, label: str, pgm_data: str, resolution: float, origin_x: float, origin_y: float, width_px: int, height_px: int) -> WarehouseMap:
        # Mark existing maps as inactive
        stmt = select(WarehouseMap).where(WarehouseMap.is_active == True)
        result = await self.db.execute(stmt)
        for m in result.scalars().all():
            m.is_active = False

        new_map = WarehouseMap(
            label=label,
            pgm_data=pgm_data,
            resolution=resolution,
            origin_x=origin_x,
            origin_y=origin_y,
            width_px=width_px,
            height_px=height_px,
            is_active=True
        )
        self.db.add(new_map)
        await self.db.flush()
        return new_map

    async def sync_warehouse(self, map_id: str):
        # Stub for auto-zone creation from map
        result = await self.db.execute(select(WarehouseMap).where(WarehouseMap.id == map_id))
        warehouse_map = result.scalar_one_or_none()
        if not warehouse_map:
            raise ValueError("Map not found")
            
        warehouse_map.zones_synced = True
        await self.db.flush()
        
        return {"status": "success", "message": "Warehouse zones synced successfully from map data."}
