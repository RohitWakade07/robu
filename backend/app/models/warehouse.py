from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.inventory import InventoryItem


class ProductCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "product_categories"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    products: Mapped[List["Product"]] = relationship(back_populates="category")


class Product(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    category: Mapped[Optional["ProductCategory"]] = relationship(back_populates="products")
    inventory_items: Mapped[List["InventoryItem"]] = relationship(back_populates="product")


class ArUcoMarker(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "aruco_markers"

    marker_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id"), nullable=True)
    shelf_id: Mapped[Optional[str]] = mapped_column(ForeignKey("shelves.id"), nullable=True)
    is_registered: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_detected_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class WarehouseZone(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "warehouse_zones"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    zone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    racks: Mapped[List["Rack"]] = relationship(back_populates="zone")


class Rack(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "racks"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    zone_id: Mapped[str] = mapped_column(ForeignKey("warehouse_zones.id"), nullable=False)
    position_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    position_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    zone: Mapped["WarehouseZone"] = relationship(back_populates="racks")
    shelves: Mapped[List["Shelf"]] = relationship(back_populates="rack")


class Shelf(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "shelves"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    rack_id: Mapped[str] = mapped_column(ForeignKey("racks.id"), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    rack: Mapped["Rack"] = relationship(back_populates="shelves")
    inventory_items: Mapped[List["InventoryItem"]] = relationship(back_populates="shelf")
