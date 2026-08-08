from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import math

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import CustomerOrder, OrderItem
from app.models.warehouse import Product


class DemandAnalysisService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_velocities(self, product_ids: Optional[List[str]] = None) -> Dict[str, Dict[str, float]]:
        """
        Calculate daily, weekly, and monthly demand velocities for SKUs.
        """
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        # Query order items within the last 30 days
        stmt = select(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("total_quantity"),
            CustomerOrder.created_at
        ).join(CustomerOrder).where(CustomerOrder.created_at >= thirty_days_ago.isoformat())
        
        if product_ids:
            stmt = stmt.where(OrderItem.product_id.in_(product_ids))
            
        stmt = stmt.group_by(OrderItem.product_id, CustomerOrder.created_at)
        
        result = await self.db.execute(stmt)
        rows = result.all()
        
        product_demand = defaultdict(lambda: {"total": 0, "daily_counts": defaultdict(int)})
        
        for row in rows:
            product_id = row.product_id
            qty = row.total_quantity
            date_str = row.created_at[:10]  # Get YYYY-MM-DD
            product_demand[product_id]["total"] += qty
            product_demand[product_id]["daily_counts"][date_str] += qty
            
        velocities = {}
        for product_id, data in product_demand.items():
            monthly = data["total"]
            daily = monthly / 30.0
            weekly = daily * 7.0
            velocities[product_id] = {
                "daily_sales_velocity": round(daily, 4),
                "weekly_sales_velocity": round(weekly, 4),
                "monthly_sales_velocity": round(monthly, 4),
                "daily_counts": data["daily_counts"] # For XYZ calculation
            }
            
        return velocities

    async def calculate_abc_classification(self, product_ids: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Calculate ABC class based on revenue contribution over the last 30 days.
        A: Top 80%, B: Next 15%, C: Bottom 5%
        """
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        stmt = select(
            OrderItem.product_id,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
        ).join(CustomerOrder).where(CustomerOrder.created_at >= thirty_days_ago.isoformat())
        
        if product_ids:
            stmt = stmt.where(OrderItem.product_id.in_(product_ids))
            
        stmt = stmt.group_by(OrderItem.product_id)
        result = await self.db.execute(stmt)
        
        revenue_map = {row.product_id: row.revenue for row in result.all()}
        
        # Sort products by revenue descending
        sorted_products = sorted(revenue_map.items(), key=lambda x: x[1], reverse=True)
        total_revenue = sum(revenue_map.values())
        
        if total_revenue == 0:
            return {p: "C" for p in revenue_map.keys()}
            
        classes = {}
        cumulative = 0.0
        
        for pid, rev in sorted_products:
            cumulative += rev
            pct = cumulative / total_revenue
            if pct <= 0.80:
                classes[pid] = "A"
            elif pct <= 0.95:
                classes[pid] = "B"
            else:
                classes[pid] = "C"
                
        return classes

    async def calculate_xyz_classification(self, velocities: Dict[str, Dict]) -> Dict[str, str]:
        """
        Calculate XYZ class based on demand predictability (Coefficient of Variation).
        X: CV < 0.5 (Stable)
        Y: 0.5 <= CV < 1.0 (Variable)
        Z: CV >= 1.0 (Highly unpredictable)
        """
        classes = {}
        for product_id, data in velocities.items():
            daily_counts = data.get("daily_counts", {})
            if not daily_counts:
                classes[product_id] = "Z"
                continue
                
            # We look at 30 days. Days without orders have 0.
            counts = [daily_counts.get(f"day_{i}", 0) for i in range(30)] # Simplified approximation, using raw values
            counts = list(daily_counts.values())
            
            # Fill missing days with 0 for accurate variance
            while len(counts) < 30:
                counts.append(0)
                
            mean = sum(counts) / 30.0
            if mean == 0:
                classes[product_id] = "Z"
                continue
                
            variance = sum((x - mean) ** 2 for x in counts) / 30.0
            std_dev = math.sqrt(variance)
            cv = std_dev / mean
            
            if cv < 0.5:
                classes[product_id] = "X"
            elif cv < 1.0:
                classes[product_id] = "Y"
            else:
                classes[product_id] = "Z"
                
        return classes

    async def run_analysis(self):
        """
        Run the full analysis pipeline and update products.
        """
        velocities = await self.calculate_velocities()
        abc_classes = await self.calculate_abc_classification()
        xyz_classes = await self.calculate_xyz_classification(velocities)
        
        # Update products in DB
        result = await self.db.execute(select(Product))
        products = result.scalars().all()
        
        for product in products:
            pid = product.id
            if pid in abc_classes:
                product.abc_class = abc_classes[pid]
            if pid in xyz_classes:
                product.xyz_class = xyz_classes[pid]
                
            # We don't store velocity in Product table, but we will use it for priority score later
            
        await self.db.commit()
        return {"status": "success", "processed_products": len(products)}
