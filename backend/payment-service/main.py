# payment-service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import asyncio, json
from common.kafka_utils import get_producer
app = FastAPI(title="Payment Service")

class PaySchema(BaseModel):
    order_id: int
    amount: float
    method: str

@app.post("/pay")
async def pay(p: PaySchema):
    # Simulate a payment success
    await asyncio.sleep(0.5)
    # emit event
    prod = await get_producer()
    await prod.send_and_wait("payment.completed", json.dumps({"order_id": p.order_id, "status": "PAID"}).encode())
    await prod.stop()
    return {"status": "PAID"}
