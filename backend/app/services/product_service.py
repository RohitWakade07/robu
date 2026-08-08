from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.warehouse import Product
from app.schemas.product import ProductCreate, ProductResponse


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_products(self) -> list[ProductResponse]:
        result = await self.db.execute(
            select(Product).where(Product.deleted_at.is_(None)).order_by(Product.name)
        )
        return [ProductResponse.model_validate(p) for p in result.scalars().all()]

    async def create_product(self, data: ProductCreate) -> ProductResponse:
        product = Product(**data.model_dump())
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product)
        return ProductResponse.model_validate(product)


