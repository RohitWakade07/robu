from typing import TYPE_CHECKING, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import UserCreate

if TYPE_CHECKING:
    from app.schemas.auth import UserCreateInternal


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate) -> User:
        """Public registration — always assigns the customer role regardless of input."""
        user = User(
            email=data.email,
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
            role=UserRole.CUSTOMER.value,  # always customer — never trust client-supplied role
            phone=data.phone,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def create_with_role(self, data: "UserCreateInternal") -> User:
        """Admin-only creation — accepts an explicit role."""
        user = User(
            email=data.email,
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
            role=data.role.value,
            phone=data.phone,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user


    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.get_by_email(email)
        if user and verify_password(password, user.hashed_password):
            return user
        return None

    async def list_all(self) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())
