from typing import Dict, List, Optional
from app.models.warehouse import Product, RackSlot

class SlotScoringService:
    def __init__(self, config: Optional[Dict] = None):
        # Default priority weights
        self.priority_weights = config.get("priority_weights", {
            "velocity": 0.25,
            "forecast": 0.20,
            "order_frequency": 0.15,
            "product_affinity": 0.10,
            "trend": 0.10,
            "seasonality": 0.05,
            "revenue": 0.10,
            "handling_cost": 0.05
        }) if config else {
            "velocity": 0.25,
            "forecast": 0.20,
            "order_frequency": 0.15,
            "product_affinity": 0.10,
            "trend": 0.10,
            "seasonality": 0.05,
            "revenue": 0.10,
            "handling_cost": 0.05
        }
        
        # Default slot weights
        self.slot_weights = config.get("slot_weights", {
            "shipping_proximity": 0.25,
            "accessibility": 0.15,
            "golden_zone": 0.15,
            "robot_accessibility": 0.15,
            "replenishment_efficiency": 0.10,
            "product_affinity": 0.10,
            "safety_match": 0.10
        }) if config else {
            "shipping_proximity": 0.25,
            "accessibility": 0.15,
            "golden_zone": 0.15,
            "robot_accessibility": 0.15,
            "replenishment_efficiency": 0.10,
            "product_affinity": 0.10,
            "safety_match": 0.10
        }

    def calculate_priority_score(self, product: Product, metrics: Dict[str, float]) -> float:
        """
        Calculate dynamic priority score for a SKU.
        Metrics should be normalized (0 to 1).
        """
        w = self.priority_weights
        
        velocity = metrics.get("velocity", 0.0)
        forecast = metrics.get("forecast", 0.0)
        freq = metrics.get("order_frequency", 0.0)
        affinity = metrics.get("product_affinity", 0.0)
        trend = metrics.get("trend", 0.0)
        season = metrics.get("seasonality", 0.0)
        revenue = metrics.get("revenue", 0.0)
        handling = metrics.get("handling_cost", 0.0)
        
        score = (
            w["velocity"] * velocity +
            w["forecast"] * forecast +
            w["order_frequency"] * freq +
            w["product_affinity"] * affinity +
            w["trend"] * trend +
            w["seasonality"] * season +
            w["revenue"] * revenue -
            w["handling_cost"] * handling
        )
        
        return max(0.0, min(1.0, score)) # Normalize between 0 and 1

    def passes_hard_constraints(self, product: Product, slot: RackSlot) -> bool:
        """
        Check if a product physically fits in a slot and meets constraints.
        """
        # Weight constraint
        if product.weight_kg and slot.max_weight:
            if product.weight_kg > slot.max_weight:
                return False
                
        # Volume constraint
        if product.volume and slot.max_volume:
            if product.volume > slot.max_volume:
                return False
                
        # Dimensional constraints
        if product.height and slot.available_height and product.height > slot.available_height:
            return False
        if product.width and slot.available_width and product.width > slot.available_width:
            return False
        if product.depth and slot.available_depth and product.depth > slot.available_depth:
            return False
            
        return True

    def calculate_slot_score(self, product: Product, slot: RackSlot, affinity_score: float = 0.0) -> float:
        """
        Calculate how suitable a rack slot is for a SKU.
        Assumes metrics on the slot are pre-normalized.
        """
        w = self.slot_weights
        
        # In a real system, these would be normalized metrics. 
        # For MVP, we simulate or derive them from basic slot attributes.
        shipping_prox = 1.0 - (slot.shipping_distance or 1.0) # Closer is better
        accessibility = 1.0 # Assume fully accessible if it passed constraints
        golden_zone = slot.golden_zone_score or 0.0
        robot_acc = 1.0 if slot.robot_accessible else 0.0
        replenishment = 0.5 # Default middle ground
        safety = 1.0 # Assuming safe match for now
        
        score = (
            w["shipping_proximity"] * shipping_prox +
            w["accessibility"] * accessibility +
            w["golden_zone"] * golden_zone +
            w["robot_accessibility"] * robot_acc +
            w["replenishment_efficiency"] * replenishment +
            w["product_affinity"] * affinity_score +
            w["safety_match"] * safety
        )
        
        return score
