import random
import uuid
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import CustomerOrder, OrderItem
from app.models.warehouse import Product


class SimulationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_synthetic_data(self) -> Dict[str, int]:
        """
        Generate synthetic products and orders to test the slotting engine.
        For simulation mode before connecting physical robots.
        """
        # Note: In a real system, you'd likely use factory-boy or bulk inserts.
        # This is a simplified scaffold for MVP testing.
        
        # 1. Generate 20 products
        products = []
        for i in range(20):
            p = Product(
                sku=f"SIM-SKU-{i:03d}",
                name=f"Simulated Product {i}",
                unit_price=round(random.uniform(5.0, 100.0), 2),
                weight_kg=round(random.uniform(0.1, 15.0), 2),
                height=round(random.uniform(10.0, 50.0), 2),
                width=round(random.uniform(10.0, 50.0), 2),
                depth=round(random.uniform(10.0, 50.0), 2),
                volume=0.0 # will be calc'd
            )
            p.volume = p.height * p.width * p.depth
            products.append(p)
            self.db.add(p)
            
        await self.db.flush() # flush to get IDs
        
        # 2. Generate 100 random orders with Pareto distribution (to trigger ABC classes)
        # Select a few "hot" products
        hot_products = products[:4] # Top 20%
        mid_products = products[4:10] # Next 30%
        slow_products = products[10:] # Bottom 50%
        
        orders_created = 0
        items_created = 0
        
        # Simulated customer id (just a random UUID for the scope of sim)
        sim_user_id = str(uuid.uuid4())
        
        for i in range(100):
            order = CustomerOrder(
                order_number=f"SIM-ORD-{i:04d}",
                customer_id=sim_user_id,
                total_amount=0.0
            )
            self.db.add(order)
            await self.db.flush()
            
            # Decide how many items (1 to 5)
            num_items = random.randint(1, 5)
            order_total = 0.0
            
            for _ in range(num_items):
                # Pick product based on pseudo-Pareto
                roll = random.random()
                if roll < 0.70:
                    prod = random.choice(hot_products)
                elif roll < 0.90:
                    prod = random.choice(mid_products)
                else:
                    prod = random.choice(slow_products)
                    
                qty = random.randint(1, 3)
                price = prod.unit_price
                
                item = OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    quantity=qty,
                    unit_price=price
                )
                self.db.add(item)
                order_total += (qty * price)
                items_created += 1
                
            order.total_amount = order_total
            orders_created += 1
            
        await self.db.commit()
        
        return {
            "products_generated": len(products),
            "orders_generated": orders_created,
            "order_items_generated": items_created
        }
