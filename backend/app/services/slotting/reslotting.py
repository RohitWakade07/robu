import uuid
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TaskStatus, TaskType
from app.models.inventory import InventoryItem
from app.models.slotting import SlotAssignment
from app.models.task import RobotTask
from app.services.slotting.slot_scoring import SlotScoringService


class ReslottingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scorer = SlotScoringService()
        self.minimum_improvement_threshold = 0.15

    async def generate_reslotting_tasks(self) -> Dict[str, int]:
        """
        Compare current inventory locations with target slot assignments.
        If the improvement in slot score is >= threshold, generate a RELOCATE task.
        """
        # Fetch latest active slot assignments
        assignments_result = await self.db.execute(select(SlotAssignment))
        assignments = assignments_result.scalars().all()
        
        target_map = {a.product_id: a for a in assignments}
        
        # Fetch current inventory that is stored on shelves/slots
        inventory_result = await self.db.execute(select(InventoryItem).where(InventoryItem.shelf_id != None))
        inventory = inventory_result.scalars().all()
        
        tasks_created = 0
        
        for item in inventory:
            target = target_map.get(item.product_id)
            if not target:
                continue
                
            # Assume shelf_id is equivalent to slot_id in our simplified bridging
            # If the item is already where it should be, skip
            if item.shelf_id == target.slot_id:
                continue
                
            # For a real calculation, we'd score the current slot.
            # Here we assume we cached the old score or recalculate it.
            # Simplified for MVP: assume current score is 0.5 (average) and compare to target score.
            current_score = 0.5
            target_score = target.slot_score or 0.0
            
            improvement = target_score - current_score
            
            if improvement >= self.minimum_improvement_threshold:
                # Generate a relocation task
                task = RobotTask(
                    task_type=TaskType.RELOCATE_CRATE.value, # or a new RELOCATE type
                    status=TaskStatus.PENDING.value,
                    priority=3, # Medium priority for reslotting
                    product_id=item.product_id,
                    source_slot=item.shelf_id,
                    destination_slot=target.slot_id,
                    reason=f"Slot optimization improvement: +{improvement:.2f}"
                )
                self.db.add(task)
                tasks_created += 1
                
        if tasks_created > 0:
            await self.db.commit()
            
        return {"tasks_created": tasks_created}
