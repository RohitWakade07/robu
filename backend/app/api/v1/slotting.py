from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.slotting import SlotAssignment
from app.models.warehouse import Product
from app.services.slotting.demand_analysis import DemandAnalysisService
from app.services.slotting.product_affinity import ProductAffinityService
from app.services.slotting.optimizer import SlottingOptimizerService
from app.services.slotting.reslotting import ReslottingService
from app.services.slotting.simulation import SimulationService


router = APIRouter()

@router.post("/analyze", response_model=Dict)
async def analyze_demand(db: AsyncSession = Depends(get_db)):
    """
    Run demand analysis to update product ABC/XYZ classes and priority scores.
    """
    service = DemandAnalysisService(db)
    result = await service.run_analysis()
    
    # We could also run affinity analysis here or separately
    affinity_service = ProductAffinityService(db)
    affinities = await affinity_service.calculate_affinities()
    
    return {
        "status": "success",
        "demand_analysis": result,
        "affinity_pairs_found": len(affinities)
    }


@router.post("/optimize", response_model=Dict)
async def optimize_slotting(db: AsyncSession = Depends(get_db)):
    """
    Run the global slotting optimization engine to generate recommendations.
    """
    service = SlottingOptimizerService(db)
    recommendations = await service.generate_recommendations()
    
    # Normally we would store these somewhere temporary or save as SlotAssignment directly
    # For MVP, we will save them. Real implementations might require approval first.
    # We clear old active recommendations first
    await db.execute(SlotAssignment.__table__.delete())
    
    for rec in recommendations:
        db.add(rec)
        
    await db.commit()
    
    return {
        "status": "success",
        "recommendations_generated": len(recommendations)
    }


@router.get("/recommendations")
async def get_recommendations(db: AsyncSession = Depends(get_db)):
    """
    Retrieve generated slot recommendations.
    """
    result = await db.execute(select(SlotAssignment))
    assignments = result.scalars().all()
    
    return [
        {
            "id": a.id,
            "product_id": a.product_id,
            "slot_id": a.slot_id,
            "priority_score": a.priority_score,
            "slot_score": a.slot_score,
            "reason": a.assignment_reason
        }
        for a in assignments
    ]


@router.post("/apply")
async def apply_recommendations(db: AsyncSession = Depends(get_db)):
    """
    Approve recommendations. (Placeholder for real implementation where recommendations are pending)
    """
    return {"status": "success", "message": "Recommendations approved."}


@router.post("/reslot")
async def generate_reslot_tasks(db: AsyncSession = Depends(get_db)):
    """
    Compare current inventory vs assignments and generate relocation tasks for robots.
    """
    service = ReslottingService(db)
    result = await service.generate_reslotting_tasks()
    
    return {
        "status": "success",
        "tasks_generated": result["tasks_created"]
    }


@router.get("/score/{product_id}")
async def get_product_score(product_id: str, db: AsyncSession = Depends(get_db)):
    """
    Return detailed SKU and slot scoring explainability for a specific product.
    """
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    assignment_result = await db.execute(
        select(SlotAssignment).where(SlotAssignment.product_id == product_id)
    )
    assignment = assignment_result.scalar_one_or_none()
    
    return {
        "product": {
            "sku": product.sku,
            "abc_class": product.abc_class,
            "xyz_class": product.xyz_class,
            "priority_score": product.priority_score
        },
        "recommendation": {
            "slot_id": assignment.slot_id if assignment else None,
            "slot_score": assignment.slot_score if assignment else None,
            "reason": assignment.assignment_reason if assignment else "No recommendation available."
        }
    }


@router.post("/simulate")
async def run_simulation(db: AsyncSession = Depends(get_db)):
    """
    Generate synthetic products and orders to test the slotting engine.
    """
    service = SimulationService(db)
    result = await service.generate_synthetic_data()
    return {
        "status": "success",
        "data": result
    }
