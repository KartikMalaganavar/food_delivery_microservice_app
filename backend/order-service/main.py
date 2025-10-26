# order-service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, JSON, Float
import sqlalchemy as sa
import asyncio
from common.kafka_utils import get_producer, stop_producer
import json

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer = Column(String)
    restaurant_id = Column(Integer)
    items = Column(JSON)  # list of {item_id, name, price, qty}
    total = Column(Float)
    status = Column(String, default="PLACED") # PLACED -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED -> CANCELLED
    delivery_partner = Column(String, nullable=True)

class PlaceOrderSchema(BaseModel):
    customer: str
    restaurant_id: int
    items: list
    total: float

app = FastAPI(title="Order Service")
producer = None

@app.on_event("startup")
async def startup():
    global producer
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    producer = await get_producer()

@app.on_event("shutdown")
async def shutdown():
    global producer
    if producer:
        await stop_producer(producer)

@app.post("/orders")
async def place_order(p: PlaceOrderSchema):
    async with AsyncSessionLocal() as session:
        new = Order(customer=p.customer, restaurant_id=p.restaurant_id, items=p.items, total=p.total, status="PLACED")
        session.add(new)
        await session.commit()
        await session.refresh(new)
        # emit kafka event
        payload = json.dumps({"order_id": new.id, "restaurant_id": new.restaurant_id, "status": new.status, "items": new.items})
        await producer.send_and_wait("order.created", payload.encode("utf-8"))
        return {"order_id": new.id, "status": new.status}

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    async with AsyncSessionLocal() as session:
        q = await session.execute(sa.select(Order).where(Order.id == order_id))
        row = q.scalar_one_or_none()
        if not row:
            raise HTTPException(404, "not found")
        return row

@app.patch("/orders/{order_id}/status")
async def update_status(order_id: int, status: str):
    async with AsyncSessionLocal() as session:
        q = await session.execute(sa.select(Order).where(Order.id == order_id))
        row = q.scalar_one_or_none()
        if not row:
            raise HTTPException(404, "not found")
        row.status = status
        session.add(row)
        await session.commit()
        # kafka event
        payload = json.dumps({"order_id": order_id, "status": status})
        await producer.send_and_wait("order.updated", payload.encode("utf-8"))
        return {"ok": True}
