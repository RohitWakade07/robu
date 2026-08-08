from fastapi import APIRouter

from app.api.v1 import admin, auth, customer, warehouse, robots, map, slotting, robot_communication

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(customer.router)
api_router.include_router(warehouse.router)
api_router.include_router(admin.router)
api_router.include_router(robots.router)
api_router.include_router(map.router)
api_router.include_router(slotting.router, prefix="/slotting", tags=["Slotting Engine"])
api_router.include_router(robot_communication.router)
