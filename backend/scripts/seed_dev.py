import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import AsyncSession

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, AsyncSessionLocal
from app.models.robot import Robot, RobotHealth
from app.models.warehouse import Product, ProductCategory, WarehouseZone, Rack, Shelf
from app.models.inventory import InventoryItem


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select
        result = await session.execute(select(Robot).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # 1. Categories
        cat1 = ProductCategory(name="Electronics", description="Electronic components and devices")
        cat2 = ProductCategory(name="Hardware", description="Fasteners, tools, and mechanical parts")
        session.add_all([cat1, cat2])
        await session.flush()

        # 2. Products
        prod1 = Product(sku="ELEC-001", name="Raspberry Pi 4", unit_price=45.00, weight_kg=0.05, category_id=cat1.id)
        prod2 = Product(sku="ELEC-002", name="Arduino Uno R3", unit_price=22.50, weight_kg=0.03, category_id=cat1.id)
        prod3 = Product(sku="HARD-001", name="M3 Screw Set", unit_price=5.99, weight_kg=0.2, category_id=cat2.id)
        session.add_all([prod1, prod2, prod3])
        await session.flush()

        # 3. Warehouse Layout (Zones, Racks, Shelves)
        zone_high = WarehouseZone(name="High Velocity", zone_type="storage")
        zone_low = WarehouseZone(name="Low Velocity", zone_type="storage")
        session.add_all([zone_high, zone_low])
        await session.flush()

        rack1 = Rack(code="R-A1", zone_id=zone_high.id, position_x=1.0, position_y=2.0)
        rack2 = Rack(code="R-B1", zone_id=zone_low.id, position_x=5.0, position_y=2.0)
        session.add_all([rack1, rack2])
        await session.flush()

        shelf1 = Shelf(code="R-A1-L1", rack_id=rack1.id, level=1)
        shelf2 = Shelf(code="R-A1-L2", rack_id=rack1.id, level=2)
        shelf3 = Shelf(code="R-B1-L1", rack_id=rack2.id, level=1)
        session.add_all([shelf1, shelf2, shelf3])
        await session.flush()

        # 4. Inventory Items
        inv1 = InventoryItem(product_id=prod1.id, shelf_id=shelf1.id, quantity=50)
        inv2 = InventoryItem(product_id=prod2.id, shelf_id=shelf2.id, quantity=200)
        inv3 = InventoryItem(product_id=prod3.id, shelf_id=shelf3.id, quantity=1000)
        session.add_all([inv1, inv2, inv3])

        # 5. Robots
        robot1 = Robot(name="Alpha-1", serial_number="AMR-A001", position_x=0.0, position_y=0.0, orientation_z=0.0, orientation_w=1.0, is_enabled=True)
        robot2 = Robot(name="Beta-2", serial_number="AMR-B002", position_x=2.0, position_y=0.0, orientation_z=0.0, orientation_w=1.0, is_enabled=True)
        session.add_all([robot1, robot2])
        await session.flush()

        health1 = RobotHealth(robot_id=robot1.id, connectivity="online")
        health2 = RobotHealth(robot_id=robot2.id, connectivity="online")
        session.add_all([health1, health2])

        await session.commit()
        print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
