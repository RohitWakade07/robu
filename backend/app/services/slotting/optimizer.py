from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.warehouse import Product, RackSlot
from app.models.slotting import SlotAssignment
from app.services.slotting.slot_scoring import SlotScoringService


class SlottingOptimizerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scorer = SlotScoringService()

    async def generate_recommendations(self) -> List[SlotAssignment]:
        """
        Run the global optimization engine.
        Returns a list of unsaved SlotAssignments representing the optimal layout.
        """
        # Fetch all products and available slots
        products_result = await self.db.execute(select(Product).where(Product.is_deleted == False))
        products = products_result.scalars().all()
        
        slots_result = await self.db.execute(select(RackSlot).where(RackSlot.is_deleted == False))
        slots = slots_result.scalars().all()
        
        # In a real system, we fetch the normalized metrics. For MVP, we simulate uniform metrics.
        # Ideally, we call DemandAnalysis and ProductAffinity services here or use cached metrics.
        
        recommendations = []
        available_slots = set(slots)
        
        # Sort products by their calculated priority score (falling back to 0.0 if not set)
        sorted_products = sorted(products, key=lambda p: p.priority_score or 0.0, reverse=True)
        
        for product in sorted_products:
            best_slot = None
            best_score = -1.0
            
            for slot in list(available_slots):
                # Hard Constraint Filter
                if not self.scorer.passes_hard_constraints(product, slot):
                    continue
                    
                # Calculate Suitability
                # (For full affinity calculation, we'd look at where affine products are placed)
                score = self.scorer.calculate_slot_score(product, slot, affinity_score=0.0)
                
                if score > best_score:
                    best_score = score
                    best_slot = slot
                    
            if best_slot:
                available_slots.remove(best_slot)
                recommendation = SlotAssignment(
                    product_id=product.id,
                    slot_id=best_slot.id,
                    priority_score=product.priority_score,
                    slot_score=best_score,
                    assignment_reason="Optimized placement based on priority and slot suitability."
                )
                recommendations.append(recommendation)
                
        return recommendations

    async def apply_recommendations(self, recommendations: List[Dict]):
        """
        Save approved recommendations to the database.
        """
        for rec in recommendations:
            assignment = SlotAssignment(
                product_id=rec["product_id"],
                slot_id=rec["slot_id"],
                priority_score=rec["priority_score"],
                slot_score=rec["slot_score"],
                assignment_reason=rec["assignment_reason"]
            )
            self.db.add(assignment)
            
        await self.db.commit()
        return {"status": "success", "assignments_saved": len(recommendations)}
