# common/kafka_utils.py
import os, asyncio
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")

async def get_producer():
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
    await producer.start()
    return producer

async def stop_producer(producer):
    await producer.stop()

# simple consumer wrapper
async def start_consumer(topic, group_id, message_handler):
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id=group_id,
        enable_auto_commit=True,
        auto_offset_reset="earliest"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            await message_handler(msg.topic, msg.value)
    finally:
        await consumer.stop()
