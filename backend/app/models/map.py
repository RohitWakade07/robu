from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WarehouseMap(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Stores the latest SLAM-generated occupancy grid map."""

    __tablename__ = "warehouse_maps"

    label: Mapped[str] = mapped_column(String(100), default="default", nullable=False)

    # PGM image stored as base64 text (or path on disk)
    pgm_data: Mapped[Optional[str]] = mapped_column(String, nullable=True)   # base64 encoded PGM
    pgm_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # YAML metadata from nav2 map_saver
    resolution: Mapped[float] = mapped_column(Float, default=0.05, nullable=False)  # metres/pixel
    origin_x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    origin_y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    width_px: Mapped[int] = mapped_column(default=0, nullable=False)
    height_px: Mapped[int] = mapped_column(default=0, nullable=False)

    # Whether warehouse zones have been auto-generated from this map
    zones_synced: Mapped[bool] = mapped_column(default=False, nullable=False)
    zones_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
