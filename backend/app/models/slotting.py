from typing import TYPE_CHECKING, Optional

from sqlalchemy import Float, ForeignKey, String, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.warehouse import Product, RackSlot


class SlotAssignment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "slot_assignments"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    slot_id: Mapped[str] = mapped_column(ForeignKey("rack_slots.id"), nullable=False)
    
    priority_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    slot_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    assignment_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    product: Mapped["Product"] = relationship(back_populates="slot_assignments")
    slot: Mapped["RackSlot"] = relationship(back_populates="assignments")


class WarehouseNode(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "warehouse_nodes"

    node_type: Mapped[str] = mapped_column(String(50), nullable=False)  # rack, shipping_zone, etc.
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    z: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class WarehouseEdge(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "warehouse_edges"

    source_node: Mapped[str] = mapped_column(ForeignKey("warehouse_nodes.id"), nullable=False)
    destination_node: Mapped[str] = mapped_column(ForeignKey("warehouse_nodes.id"), nullable=False)
    distance: Mapped[float] = mapped_column(Float, nullable=False)
    travel_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    robot_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
