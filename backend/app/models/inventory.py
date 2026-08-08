from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.warehouse import Product, Shelf


class InventoryItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "inventory_items"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    shelf_id: Mapped[Optional[str]] = mapped_column(ForeignKey("shelves.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aruco_marker_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_verified_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_verified_by_robot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="robot_observation", nullable=False)

    product: Mapped["Product"] = relationship(back_populates="inventory_items")
    shelf: Mapped[Optional["Shelf"]] = relationship(back_populates="inventory_items")


class InventoryEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "inventory_events"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    inventory_item_id: Mapped[Optional[str]] = mapped_column(ForeignKey("inventory_items.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity_change: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    robot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
