import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RobotStatus
from app.models.robot import Robot, RobotHealth
from app.schemas.robot import RobotCreate, RobotResponse, RobotHealthResponse
from app.websocket.gateway import manager


class RobotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_robots(self) -> list[RobotResponse]:
        result = await self.db.execute(
            select(Robot).where(Robot.deleted_at.is_(None)).order_by(Robot.name)
        )
        return [RobotResponse.model_validate(r) for r in result.scalars().all()]

    async def get_robot(self, robot_id: str) -> Optional[RobotResponse]:
        result = await self.db.execute(select(Robot).where(Robot.id == robot_id))
        robot = result.scalar_one_or_none()
        return RobotResponse.model_validate(robot) if robot else None

    async def create_robot(self, data: RobotCreate) -> RobotResponse:
        robot = Robot(**data.model_dump())
        self.db.add(robot)
        health = RobotHealth(robot=robot, connectivity="offline")
        self.db.add(health)
        
        await self.db.flush()
        
        query = select(Robot).where(Robot.id == robot.id)
        result = await self.db.execute(query)
        robot_refreshed = result.scalar_one()
        return RobotResponse.model_validate(robot_refreshed)

    async def get_robot_health(self, robot_id: str) -> Optional[RobotHealthResponse]:
        result = await self.db.execute(select(RobotHealth).where(RobotHealth.robot_id == robot_id))
        health = result.scalar_one_or_none()
        return RobotHealthResponse.model_validate(health) if health else None

    async def update_robot_odom(self, robot_id: str, x: float, y: float, theta_z: float, theta_w: float, linear_v: float, angular_v: float):
        stmt = (
            update(Robot)
            .where(Robot.id == robot_id)
            .values(
                position_x=x,
                position_y=y,
                orientation_z=theta_z,
                orientation_w=theta_w,
                linear_velocity=linear_v,
                angular_velocity=angular_v,
                last_odom_at=datetime.now(timezone.utc),
            )
        )
        await self.db.execute(stmt)
        
        # Broadcast via websocket
        await manager.broadcast(
            "robot_position",
            {
                "robot_id": robot_id,
                "x": x,
                "y": y,
                "theta_z": theta_z,
                "theta_w": theta_w,
                "linear_velocity": linear_v,
                "angular_velocity": angular_v,
            }
        )

    async def send_command(self, robot_id: str, command: str, payload: dict):
        # Here we would normally interface with ROS2 (e.g. via ros2_bridge)
        # For now, we simulate dispatch and broadcast
        logger_msg = f"Sending command {command} to robot {robot_id} with payload {payload}"
        print(logger_msg) # Replace with proper logging if needed
        
        await manager.broadcast(
            "robot_command",
            {
                "robot_id": robot_id,
                "command": command,
                "payload": payload,
            }
        )
