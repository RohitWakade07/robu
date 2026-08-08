from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import TaskStatus, TaskType
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.robot import Robot


class RobotTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "robot_tasks"

    task_type: Mapped[str] = mapped_column(String(50), default=TaskType.STORE_CRATE.value, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=TaskStatus.PENDING.value, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    robot_id: Mapped[Optional[str]] = mapped_column(ForeignKey("robots.id"), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    robot: Mapped[Optional["Robot"]] = relationship(back_populates="tasks")
    events: Mapped[List["TaskExecutionHistory"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskExecutionHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "task_execution_history"

    task_id: Mapped[str] = mapped_column(ForeignKey("robot_tasks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    robot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    task: Mapped["RobotTask"] = relationship(back_populates="events")


class RobotEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "robot_events"

    robot_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
