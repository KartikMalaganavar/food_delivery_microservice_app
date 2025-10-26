# delivery-service/main.py
from fastapi import FastAPI
import asyncio, json
from common.kafka_utils import start_consumer, get_producer, stop_producer
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String
import sqlalchemy as sa

class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer)
    partner = Column(String)
    status = Column(String, default="PENDING")

app = FastAPI(title="Delivery Service")

async def handle_message(topic, value):
    data = json.loads(value.decode())
    # if order updated to READY -> create assignment
    if topic == "order.updated":
        order_id = data.get("order_id")
        status = data.get("status")
        if status == "READY":
            async with AsyncSessionLocal() as session:
                new = DeliveryAssignment(order_id=order_id, partner=None, status="ASSIGNED")
                session.add(new)
                await session.commit()
            # notify via kafka for notifications/emitter
            prod = await get_producer()
            await prod.send_and_wait("delivery.assigned", json.dumps({"order_id": order_id}).encode())
            await stop_producer(prod)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # start consumer loop in background
    asyncio.create_task(start_consumer("order.updated", group_id="delivery-group", message_handler=handle_message))
