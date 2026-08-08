from collections import defaultdict
from typing import Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import OrderItem


class ProductAffinityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_affinities(self) -> Dict[str, List[Tuple[str, float]]]:
        """
        Calculate product affinity using a co-occurrence matrix approach.
        Returns a dictionary mapping a product_id to a list of (related_product_id, affinity_score).
        """
        # Fetch all order items grouped by order_id
        stmt = select(OrderItem.order_id, OrderItem.product_id)
        result = await self.db.execute(stmt)
        
        # Build order -> list[product_id] map
        order_baskets = defaultdict(list)
        product_frequencies = defaultdict(int)
        
        for row in result.all():
            order_id = row.order_id
            product_id = row.product_id
            order_baskets[order_id].append(product_id)
            product_frequencies[product_id] += 1
            
        co_occurrence = defaultdict(lambda: defaultdict(int))
        
        # Count co-occurrences
        for basket in order_baskets.values():
            unique_basket = list(set(basket)) # Remove duplicates within same order
            for i in range(len(unique_basket)):
                for j in range(i + 1, len(unique_basket)):
                    p1 = unique_basket[i]
                    p2 = unique_basket[j]
                    co_occurrence[p1][p2] += 1
                    co_occurrence[p2][p1] += 1
                    
        # Calculate affinity scores (Confidence/Support proxy)
        # We will use Jaccard similarity: intersection / union
        affinity_map = defaultdict(list)
        
        for p1, related in co_occurrence.items():
            for p2, count in related.items():
                freq1 = product_frequencies[p1]
                freq2 = product_frequencies[p2]
                
                # Jaccard index
                union = freq1 + freq2 - count
                if union > 0:
                    score = count / union
                    affinity_map[p1].append((p2, round(score, 4)))
                    
        # Sort by score descending
        for p1 in affinity_map:
            affinity_map[p1].sort(key=lambda x: x[1], reverse=True)
            
        return dict(affinity_map)

    async def get_affinity_score(self, product_a: str, product_b: str, affinity_map: Dict[str, List[Tuple[str, float]]]) -> float:
        """
        Get the specific affinity score between two products from the map.
        """
        if product_a not in affinity_map:
            return 0.0
            
        for related_id, score in affinity_map[product_a]:
            if related_id == product_b:
                return score
                
        return 0.0
