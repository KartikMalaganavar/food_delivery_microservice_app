# # notification-service/main.py
# from fastapi import FastAPI
# import asyncio, json
# from common.kafka_utils import start_consumer
# app = FastAPI(title="Notification Service")

# async def handler(topic, value):
#     data = json.loads(value.decode())
#     print(f"[NOTIFICATION] topic={topic} payload={data}")
#     # In production: push to FCM / SMS provider / websockets

# @app.on_event("startup")
# async def startup():
#     asyncio.create_task(start_consumer("order.created", group_id="notify-group", message_handler=handler))
#     asyncio.create_task(start_consumer("order.updated", group_id="notify-group", message_handler=handler))
#     asyncio.create_task(start_consumer("delivery.assigned", group_id="notify-group", message_handler=handler))



# from fastapi import FastAPI
# import asyncio, json
# from common.kafka_utils import start_consumer

# app = FastAPI(title="Notification Service")

# async def handler(topic, value):
#     data = json.loads(value.decode())
#     print(f"[NOTIFICATION] topic={topic} payload={data}")

# @app.on_event("startup")
# async def startup_event():
#     loop = asyncio.get_event_loop()
#     loop.create_task(start_consumer("order.created", group_id="notify-group", message_handler=handler))
#     loop.create_task(start_consumer("order.updated", group_id="notify-group", message_handler=handler))
#     loop.create_task(start_consumer("delivery.assigned", group_id="notify-group", message_handler=handler))



# from fastapi import FastAPI
# import asyncio, json
# from common.kafka_utils import start_consumer

# app = FastAPI(title="Notification Service")

# async def handler(topic, value):
#     data = json.loads(value.decode())
#     print(f"[NOTIFICATION] topic={topic} payload={data}")

# # Keep a global list to stop consumers on shutdown
# consumers = []

# @app.on_event("startup")
# async def startup_event():
#     print("🚀 Notification service starting...")
#     consumers.append(asyncio.create_task(start_consumer("order.created", "notify-group", handler)))
#     consumers.append(asyncio.create_task(start_consumer("order.updated", "notify-group", handler)))
#     consumers.append(asyncio.create_task(start_consumer("delivery.assigned", "notify-group", handler)))
#     await asyncio.sleep(1)
#     print("✅ Consumers launched!")

# @app.on_event("shutdown")
# async def shutdown_event():
#     print("🛑 Shutting down consumers...")
#     for c in consumers:
#         c.cancel()
#     await asyncio.gather(*consumers, return_exceptions=True)



# # notification-service/main.py
# from fastapi import FastAPI
# import asyncio
# import json
# from common.kafka_utils import start_consumer

# app = FastAPI(title="Notification Service")

# # Track background consumer tasks
# consumer_tasks = []

# async def handle_event(topic, value):
#     """Handles Kafka messages."""
#     try:
#         data = json.loads(value.decode())
#         print(f"[NOTIFICATION] topic={topic} | data={data}")
#     except Exception as e:
#         print(f"❌ Failed to process message from {topic}: {e}")

# @app.on_event("startup")
# async def startup_event():
#     print("🚀 Notification Service starting up...")

#     topics = ["order.created", "order.updated", "delivery.assigned"]

#     for topic in topics:
#         task = asyncio.create_task(start_consumer(topic, "notify-group", handle_event))
#         consumer_tasks.append(task)
#         print(f"🧠 Consumer task launched for topic: {topic}")

#     await asyncio.sleep(2)
#     print("✅ All consumers running!")

# @app.on_event("shutdown")
# async def shutdown_event():
#     print("🛑 Shutting down Notification Service...")
#     for task in consumer_tasks:
#         task.cancel()
#     await asyncio.gather(*consumer_tasks, return_exceptions=True)
#     print("👋 Consumers stopped.")



from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import json
from common.kafka_utils import start_consumer

# List of Kafka topics to consume
TOPICS = ["order.created", "order.updated", "delivery.assigned"]

# Keep track of consumer tasks globally
consumer_tasks = []


async def handle_event(topic: str, value: bytes):
    """Handles Kafka messages."""
    try:
        data = json.loads(value.decode())
        print(f"📩 [NOTIFICATION] topic={topic} | data={data}")
    except Exception as e:
        print(f"❌ Failed to process message from {topic}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown management for FastAPI."""
    print("🚀 Notification Service is starting...")

    # Start Kafka consumers
    for topic in TOPICS:
        print(f"🧠 Starting consumer for topic: {topic}")
        task = asyncio.create_task(start_consumer(topic, "notify-group", handle_event))
        consumer_tasks.append(task)

    # Wait a moment to confirm all consumers start
    await asyncio.sleep(1)
    print("✅ All Kafka consumers running!")

    # Yield control to FastAPI (service is now live)
    yield

    # Shutdown phase — gracefully cancel all consumers
    print("🛑 Shutting down Notification Service...")
    for task in consumer_tasks:
        task.cancel()
    await asyncio.gather(*consumer_tasks, return_exceptions=True)
    print("👋 All consumers stopped. Bye!")


# Initialize app with lifespan
app = FastAPI(title="Notification Service", lifespan=lifespan)
