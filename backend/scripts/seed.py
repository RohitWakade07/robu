"""Seed initial data for development."""

import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("seed")

from sqlalchemy import select

from app.core.enums import UserRole
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.robot import Robot, RobotHealth  # noqa: F401 – registers models
from app.models.user import User
from app.models.warehouse import Product, ProductCategory, WarehouseZone  # noqa: F401
from app.models.inventory import InventoryItem


async def seed() -> None:
    # Ensure all tables exist before inserting rows
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables verified / created.")
    async with AsyncSessionLocal() as db:
        users_to_seed = [
            ("admin@arms.io", "admin12345", "ARMS System Administrator", UserRole.ADMINISTRATOR.value),
            ("operator@arms.io", "operator123", "ARMS Fleet Operator", UserRole.WAREHOUSE_OPERATOR.value),
            ("customer@arms.io", "customer123", "ARMS Demo Customer", UserRole.CUSTOMER.value),
            ("admin@robu.io", "admin12345", "System Administrator", UserRole.ADMINISTRATOR.value),
            ("operator@robu.io", "operator123", "Warehouse Operator", UserRole.WAREHOUSE_OPERATOR.value),
            ("customer@robu.io", "customer123", "Demo Customer", UserRole.CUSTOMER.value),
        ]
        for email, pwd, name, role in users_to_seed:
            existing = await db.execute(select(User).where(User.email == email))
            if not existing.scalar_one_or_none():
                db.add(User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    full_name=name,
                    role=role,
                ))
        await db.commit()

        cat_existing = await db.execute(select(ProductCategory).where(ProductCategory.name == "Electronics"))
        cat = cat_existing.scalar_one_or_none()
        if not cat:
            cat = ProductCategory(name="Electronics", description="Electronic components and devices")
            db.add(cat)
            await db.flush()

        prod_existing = await db.execute(select(Product).where(Product.sku == "SKU-001"))
        if not prod_existing.scalar_one_or_none():
            products = [
                Product(sku="SKU-001", name="Microcontroller Board", category_id=cat.id, unit_price=29.99),
                Product(sku="SKU-002", name="Sensor Module Kit", category_id=cat.id, unit_price=49.99),
                Product(sku="SKU-003", name="Motor Driver Unit", category_id=cat.id, unit_price=79.99),
            ]
            db.add_all(products)
            await db.flush()

            inventory_items = [
                InventoryItem(product_id=p.id, quantity=100, reserved_quantity=0) for p in products
            ]
            db.add_all(inventory_items)

        zone_existing = await db.execute(select(WarehouseZone).where(WarehouseZone.name == "Intake Zone"))
        if not zone_existing.scalar_one_or_none():
            zones = [
                WarehouseZone(name="Intake Zone", zone_type="intake"),
                WarehouseZone(name="Storage Zone A", zone_type="storage"),
                WarehouseZone(name="Shipping Zone", zone_type="shipping"),
                WarehouseZone(name="Charging Station", zone_type="charging"),
            ]
            db.add_all(zones)

        robot_existing = await db.execute(select(Robot).where(Robot.name == "AMR-Alpha"))
        if not robot_existing.scalar_one_or_none():
            robot = Robot(name="AMR-Alpha", serial_number="ROBU-001", status="idle", battery_level=95.0)
            db.add(robot)
            await db.flush()
            db.add(RobotHealth(robot_id=robot.id, connectivity="online"))

        await db.commit()
        print("Seed data created successfully.")
        print("  Admin:    admin@robu.io / admin12345")
        print("  Operator: operator@robu.io / operator123")
        print("  Customer: customer@robu.io / customer123")


if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as exc:  # noqa: BLE001
        logger.error("Seeding failed (server will still start): %s", exc)
        sys.exit(0)  # exit 0 so the ; chain continues to uvicorn
