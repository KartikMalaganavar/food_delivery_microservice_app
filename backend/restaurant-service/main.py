# restaurant-service/main.py
from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, Float, Text
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
import asyncio

class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    address = Column(String)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, index=True)
    name = Column(String)
    description = Column(Text)
    price = Column(Float)
    available = Column(sa.Boolean, default=True)

class MenuItemSchema(BaseModel):
    restaurant_id: int
    name: str
    description: str = ""
    price: float
    available: bool = True

app = FastAPI(title="Restaurant Service")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.post("/restaurants")
async def create_restaurant(r: dict):
    async with AsyncSessionLocal() as session:
        new = Restaurant(**r)
        session.add(new)
        await session.commit()
        return {"ok": True}

@app.get("/restaurants")
async def list_restaurants():
    async with AsyncSessionLocal() as session:
        q = await session.execute(sa.select(Restaurant))
        rows = q.scalars().all()
        return rows

@app.post("/menu")
async def add_menu_item(item: MenuItemSchema):
    async with AsyncSessionLocal() as session:
        new = MenuItem(**item.dict())
        session.add(new)
        await session.commit()
        return {"ok": True}

@app.get("/menu/{restaurant_id}")
async def get_menu(restaurant_id: int):
    async with AsyncSessionLocal() as session:
        q = await session.execute(sa.select(MenuItem).where(MenuItem.restaurant_id == restaurant_id))
        return q.scalars().all()
