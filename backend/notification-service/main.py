# notification-service/main.py
from fastapi import FastAPI
import asyncio, json
from common.kafka_utils import start_consumer
app = FastAPI(title="Notification Service")

async def handler(topic, value):
    data = json.loads(value.decode())
    print(f"[NOTIFICATION] topic={topic} payload={data}")
    # In production: push to FCM / SMS provider / websockets

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_consumer("order.created", group_id="notify-group", message_handler=handler))
    asyncio.create_task(start_consumer("order.updated", group_id="notify-group", message_handler=handler))
    asyncio.create_task(start_consumer("delivery.assigned", group_id="notify-group", message_handler=handler))

