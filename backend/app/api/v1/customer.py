from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.product import OrderCreate, OrderResponse, ProductCreate, ProductResponse
from app.services.order_service import OrderService
from app.services.product_service import ProductService

router = APIRouter(tags=["Customer Portal"])


@router.get("/products", response_model=list[ProductResponse])
async def list_products(db: Annotated[AsyncSession, Depends(get_db)]):
    service = ProductService(db)
    try:
        return await service.list_products()
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMINISTRATOR))],
):
    service = ProductService(db)
    try:
        return await service.create_product(data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Conflict / constraint violation")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.CUSTOMER, UserRole.ADMINISTRATOR))],
):
    service = OrderService(db)
    try:
        return await service.create_order(current_user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Conflict / constraint violation")
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")


@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    service = OrderService(db)
    customer_id = None if current_user.role == UserRole.ADMINISTRATOR.value else current_user.id
    try:
        return await service.list_orders(customer_id)
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error processing request")
