import heapq
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slotting import WarehouseEdge, WarehouseNode


class WarehouseGraphService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.graph: Dict[str, List[Tuple[str, float]]] = {}
        self.nodes: Dict[str, WarehouseNode] = {}

    async def load_graph(self):
        """
        Load nodes and edges from the database into memory.
        """
        # Load nodes
        nodes_result = await self.db.execute(select(WarehouseNode))
        for node in nodes_result.scalars().all():
            self.nodes[node.id] = node
            self.graph[node.id] = []

        # Load edges
        edges_result = await self.db.execute(select(WarehouseEdge))
        for edge in edges_result.scalars().all():
            # Assuming undirected graph for warehouse aisles unless specified
            if edge.source_node in self.graph and edge.destination_node in self.graph:
                self.graph[edge.source_node].append((edge.destination_node, edge.distance))
                self.graph[edge.destination_node].append((edge.source_node, edge.distance))

    def heuristic(self, node_a_id: str, node_b_id: str) -> float:
        """
        Euclidean distance heuristic for A*
        """
        node_a = self.nodes.get(node_a_id)
        node_b = self.nodes.get(node_b_id)
        if not node_a or not node_b:
            return 0.0
            
        dx = node_a.x - node_b.x
        dy = node_a.y - node_b.y
        return (dx ** 2 + dy ** 2) ** 0.5

    async def calculate_shortest_path(self, start_node_id: str, end_node_id: str) -> Optional[Tuple[List[str], float]]:
        """
        Calculate the shortest path using the A* algorithm.
        Returns a tuple of (path_node_ids, total_distance).
        """
        if not self.graph:
            await self.load_graph()
            
        if start_node_id not in self.graph or end_node_id not in self.graph:
            return None
            
        open_set = []
        heapq.heappush(open_set, (0.0, start_node_id))
        
        came_from = {}
        g_score = {node_id: float("inf") for node_id in self.nodes}
        g_score[start_node_id] = 0.0
        
        f_score = {node_id: float("inf") for node_id in self.nodes}
        f_score[start_node_id] = self.heuristic(start_node_id, end_node_id)
        
        while open_set:
            current_f, current_id = heapq.heappop(open_set)
            
            if current_id == end_node_id:
                # Reconstruct path
                path = [current_id]
                while current_id in came_from:
                    current_id = came_from[current_id]
                    path.append(current_id)
                path.reverse()
                return path, g_score[end_node_id]
                
            for neighbor_id, distance in self.graph.get(current_id, []):
                tentative_g = g_score[current_id] + distance
                
                if tentative_g < g_score[neighbor_id]:
                    came_from[neighbor_id] = current_id
                    g_score[neighbor_id] = tentative_g
                    f_score[neighbor_id] = tentative_g + self.heuristic(neighbor_id, end_node_id)
                    # We just push to heap; Python heapq doesn't support decrease-key directly, 
                    # but pushing duplicates is fine for simple A* implementation
                    heapq.heappush(open_set, (f_score[neighbor_id], neighbor_id))
                    
        return None  # No path found
