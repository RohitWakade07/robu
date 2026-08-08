"""ROS2 Bridge - high-level task interface for robotics integration.

This module provides abstract task definitions consumed by the ROS2 layer.
The backend never publishes low-level navigation or motor commands.
"""

import json
import logging
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RobotEventType, TaskStatus
from app.models.task import RobotEvent, RobotTask, TaskExecutionHistory

logger = logging.getLogger(__name__)


class ROS2Bridge:
    """Bridge between backend orchestration and ROS2 robotics system."""

    async def dispatch_task(self, db: AsyncSession, task_id: str) -> bool:
        """Send a high-level task to the ROS2 layer for execution."""
        result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            logger.error("Task %s not found for dispatch", task_id)
            return False

        task.status = TaskStatus.ASSIGNED.value
        logger.info(
            "Dispatching task %s (type=%s) to ROS2 bridge",
            task_id,
            task.task_type,
        )
        # ROS2 integration point: publish task to message queue/topic
        return True

    async def process_robot_event(
        self,
        db: AsyncSession,
        robot_id: str,
        event_type: RobotEventType,
        task_id: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
    ) -> None:
        """Process incoming events from the robotics layer."""
        event = RobotEvent(
            robot_id=robot_id,
            task_id=task_id,
            event_type=event_type.value,
            payload=json.dumps(payload) if payload else None,
        )
        db.add(event)

        if task_id:
            history = TaskExecutionHistory(
                task_id=task_id,
                event_type=event_type.value,
                robot_id=robot_id,
                message=payload.get("message") if payload else None,
            )
            db.add(history)

            if event_type == RobotEventType.MISSION_COMPLETED:
                result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
                task = result.scalar_one_or_none()
                if task:
                    task.status = TaskStatus.COMPLETED.value
            elif event_type == RobotEventType.TASK_FAILED:
                result = await db.execute(select(RobotTask).where(RobotTask.id == task_id))
                task = result.scalar_one_or_none()
                if task:
                    task.status = TaskStatus.FAILED.value
                    task.error_message = payload.get("error") if payload else "Task failed"

        await db.flush()
        logger.info("Processed robot event: %s from robot %s", event_type.value, robot_id)


ros2_bridge = ROS2Bridge()
