from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ShipmentStatus
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class IncomingShipment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "incoming_shipments"

    shipment_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    operator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=ShipmentStatus.REGISTERED.value, nullable=False)
    assigned_robot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    operator: Mapped["User"] = relationship(back_populates="shipments")
    items: Mapped[List["ShipmentItem"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")


class ShipmentItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "shipment_items"

    shipment_id: Mapped[str] = mapped_column(ForeignKey("incoming_shipments.id"), nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id"), nullable=True)
    expected_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    aruco_marker_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    crate_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)

    shipment: Mapped["IncomingShipment"] = relationship(back_populates="items")
