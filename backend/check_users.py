import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User

async def main():
    async with AsyncSessionLocal() as db:
        users = await db.execute(select(User))
        print([u.email for u in users.scalars().all()])

asyncio.run(main())
