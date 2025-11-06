# # payment-service/main.py
# from fastapi import FastAPI
# from pydantic import BaseModel
# import asyncio, json
# from common.kafka_utils import get_producer
# app = FastAPI(title="Payment Service")

# class PaySchema(BaseModel):
#     order_id: int
#     amount: float
#     method: str

# @app.post("/pay")
# async def pay(p: PaySchema):
#     # Simulate a payment success
#     await asyncio.sleep(0.5)
#     # emit event
#     prod = await get_producer()
#     await prod.send_and_wait("payment.completed", json.dumps({"order_id": p.order_id, "status": "PAID"}).encode())
#     await prod.stop()
#     return {"status": "PAID"}





# payment-service/main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json
import uuid
from datetime import datetime
from common.kafka_utils import get_producer, start_consumer, stop_producer
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import os


app = FastAPI(title="Payment Service")

# Payment Model
class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, unique=True, index=True)  # External reference
    order_id = Column(Integer, nullable=False, index=True)
    order_number = Column(String, index=True)
    customer_id = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    payment_method = Column(String)  # card, upi, wallet, cash_on_delivery
    payment_gateway = Column(String)  # stripe, razorpay, etc.
    status = Column(String, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
    gateway_transaction_id = Column(String, nullable=True)
    gateway_response = Column(Text, nullable=True)  # Raw response from gateway
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_refunded = Column(Boolean, default=False)
    refund_amount = Column(Float, default=0.0)

# Pydantic Schemas
class PaySchema(BaseModel):
    order_id: int
    order_number: str
    amount: float
    method: str  # card, upi, wallet, cash_on_delivery
    customer_id: str
    currency: str = "USD"

class RefundSchema(BaseModel):
    payment_id: str
    amount: Optional[float] = None  # Partial refund, if None full amount
    reason: str

class PaymentResponseSchema(BaseModel):
    payment_id: str
    order_id: int
    order_number: str
    amount: float
    currency: str
    payment_method: str
    status: str
    gateway_transaction_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentWebhookSchema(BaseModel):
    payment_id: str
    transaction_id: str
    status: str
    signature: Optional[str] = None  # For webhook verification
    raw_response: dict

# Global variables
producer = None
consumer_task = None

@app.on_event("startup")
async def startup():
    global producer
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    producer = await get_producer()
    
    # Start Kafka consumer in background
    asyncio.create_task(consume_order_events())

@app.on_event("shutdown")
async def shutdown():
    global producer
    if producer:
        await stop_producer(producer)
    if consumer_task:
        consumer_task.cancel()

async def consume_order_events():
    """Consume order events and trigger payment process"""
    
    consumer = AIOKafkaConsumer(
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"),
        group_id="payment-service-group",
        enable_auto_commit=True,
        auto_offset_reset="earliest"
    )
    consumer.subscribe(["order.created", "order.cancelled"])
    
    try:
        await consumer.start()

        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode())
                topic = msg.topic
                
                if topic == "order.created":
                    await handle_order_created(data)
                elif topic == "order.cancelled":
                    await handle_order_cancelled(data)
                    
            except Exception as e:
                print(f"Error processing message: {e}")
                # In production, log to monitoring system
    except Exception as e:
        print(f"Consumer error: {e}")
    finally:
        await consumer.stop()

async def handle_order_created(order_data: dict):
    """Handle new order creation - initiate payment process"""
    try:
        # In a real scenario, you might wait for user to initiate payment
        # or automatically process if it's cash_on_delivery
        
        # For demo, we'll auto-process payments above a certain threshold
        # or simulate different payment methods
        
        order_id = order_data.get("order_id")
        order_number = order_data.get("order_number", f"ORD-{order_id}")
        customer_id = order_data.get("customer_id")
        total = order_data.get("total", 0)
        
        # Create a pending payment record
        async with AsyncSessionLocal() as session:
            payment = Payment(
                payment_id=f"PAY-{uuid.uuid4().hex[:8].upper()}",
                order_id=order_id,
                order_number=order_number,
                customer_id=customer_id,
                amount=total,
                payment_method="COD",  # Default, can be changed via API
                status="PENDING"
            )
            session.add(payment)
            await session.commit()
            
            print(f"Created pending payment {payment.payment_id} for order {order_number}")
            
    except Exception as e:
        print(f"Error handling order created: {e}")

async def handle_order_cancelled(order_data: dict):
    """Handle order cancellation - process refund if payment was completed"""
    try:
        order_id = order_data.get("order_id")
        
        async with AsyncSessionLocal() as session:
            # Find completed payment for this order
            payment = await session.execute(
                sa.select(Payment).where(
                    Payment.order_id == order_id,
                    Payment.status == "COMPLETED",
                    Payment.is_refunded == False
                )
            )
            payment = payment.scalar_one_or_none()
            
            if payment:
                # Process refund
                await process_refund(payment, "Order cancelled")
                
    except Exception as e:
        print(f"Error handling order cancelled: {e}")

async def process_payment(payment: Payment) -> bool:
    """Simulate payment processing with various payment methods"""
    try:
        # Simulate different failure rates based on payment method
        failure_rates = {
            "card": 0.05,      # 5% failure rate
            "upi": 0.03,       # 3% failure rate  
            "wallet": 0.02,    # 2% failure rate
            "cash_on_delivery": 0.00  # Always succeeds
        }
        
        failure_rate = failure_rates.get(payment.payment_method, 0.1)
        
        # Simulate processing time
        await asyncio.sleep(1)
        
        # Simulate random failure
        import random
        # if random.random() < failure_rate:
        #     payment.status = "FAILED"
        #     payment.gateway_response = json.dumps({"error": "Payment failed due to insufficient funds"})
        #     return False
        # else:
        payment.status = "COMPLETED"
        payment.gateway_transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        payment.gateway_response = json.dumps({"status": "success", "transaction_id": payment.gateway_transaction_id})
        return True
            
    except Exception as e:
        payment.status = "FAILED"
        payment.gateway_response = json.dumps({"error": str(e)})
        return False

async def process_refund(payment: Payment, reason: str, refund_amount: float = None):
    """Process refund for a payment"""
    try:
        amount = refund_amount or payment.amount
        
        # Simulate refund processing
        await asyncio.sleep(0.5)
        
        async with AsyncSessionLocal() as session:
            payment.is_refunded = True
            payment.refund_amount = amount
            payment.status = "REFUNDED"
            session.add(payment)
            await session.commit()
            
            # Emit refund event
            event_data = {
                "payment_id": payment.payment_id,
                "order_id": payment.order_id,
                "order_number": payment.order_number,
                "refund_amount": amount,
                "reason": reason
            }
            await producer.send_and_wait("payment.refunded", json.dumps(event_data).encode())
            
    except Exception as e:
        print(f"Error processing refund: {e}")

# API Endpoints
# @app.post("/payments/initiate", response_model=PaymentResponseSchema)
# async def initiate_payment(payload: PaySchema, background_tasks: BackgroundTasks):
#     """Initiate a payment for an order"""
#     async with AsyncSessionLocal() as session:
#         # Check if payment already exists
#         existing_payment = await session.execute(
#             sa.select(Payment).where(Payment.order_id == payload.order_id)
#         )
#         existing_payment = existing_payment.scalar_one_or_none()
        
#         if existing_payment and existing_payment.status in ["COMPLETED", "PROCESSING"]:
#             raise HTTPException(status_code=400, detail="Payment already exists for this order")
        
#         # Create new payment
#         payment = Payment(
#             payment_id=f"PAY-{uuid.uuid4().hex[:8].upper()}",
#             order_id=payload.order_id,
#             order_number=payload.order_number,
#             customer_id=payload.customer_id,
#             amount=payload.amount,
#             currency=payload.currency,
#             payment_method=payload.method,
#             status="PROCESSING"
#         )
        
#         session.add(payment)
#         await session.commit()
#         await session.refresh(payment)
        
#         # Process payment in background
#         background_tasks.add_task(process_payment_background, payment.id)
        
#         return payment

@app.post("/payments/initiate", response_model=PaymentResponseSchema)
async def initiate_payment(payload: PaySchema, background_tasks: BackgroundTasks):
    """Initiate a payment for an order"""
    async with AsyncSessionLocal() as session:
        # Check if payment already exists
        existing_payment = await session.execute(
            sa.select(Payment).where(Payment.order_id == payload.order_id)
        )
        existing_payment = existing_payment.scalar_one_or_none()
        
        if existing_payment:
            # Update existing payment
            if existing_payment.status in ["COMPLETED", "PROCESSING"]:
                raise HTTPException(status_code=400, detail="Payment already exists for this order")
            
            # Update the existing payment with new details
            existing_payment.order_number = payload.order_number
            existing_payment.customer_id = payload.customer_id
            existing_payment.amount = payload.amount
            existing_payment.currency = payload.currency
            existing_payment.payment_method = payload.method
            existing_payment.status = "PROCESSING"
            existing_payment.updated_at = datetime.utcnow()
            
            payment = existing_payment
        else:
            # Create new payment if doesn't exist
            payment = Payment(
                payment_id=f"PAY-{uuid.uuid4().hex[:8].upper()}",
                order_id=payload.order_id,
                order_number=payload.order_number,
                customer_id=payload.customer_id,
                amount=payload.amount,
                currency=payload.currency,
                payment_method=payload.method,
                status="PROCESSING"
            )
            session.add(payment)
        
        await session.commit()
        await session.refresh(payment)
        
        # Process payment in background
        background_tasks.add_task(process_payment_background, payment.id)
        
        return payment


async def process_payment_background(payment_id: int):
    """Background task to process payment"""
    async with AsyncSessionLocal() as session:
        payment = await session.execute(
            sa.select(Payment).where(Payment.id == payment_id)
        )
        payment = payment.scalar_one_or_none()
        
        if not payment:
            return
        
        success = await process_payment(payment)
        session.add(payment)
        await session.commit()
        
        # Emit payment event
        event_data = {
            "payment_id": payment.payment_id,
            "order_id": payment.order_id,
            "order_number": payment.order_number,
            "status": payment.status,
            "transaction_id": payment.gateway_transaction_id,
            "amount": payment.amount
        }
        
        if success:
            await producer.send_and_wait("payment.completed", json.dumps(event_data).encode())
        else:
            await producer.send_and_wait("payment.failed", json.dumps(event_data).encode())

@app.post("/payments/{payment_id}/refund")
async def refund_payment(payment_id: str, payload: RefundSchema):
    """Process refund for a payment"""
    async with AsyncSessionLocal() as session:
        payment = await session.execute(
            sa.select(Payment).where(Payment.payment_id == payment_id)
        )
        payment = payment.scalar_one_or_none()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment.status != "COMPLETED":
            raise HTTPException(status_code=400, detail="Only completed payments can be refunded")
        
        if payment.is_refunded:
            raise HTTPException(status_code=400, detail="Payment already refunded")
        
        refund_amount = payload.amount or payment.amount
        if refund_amount > payment.amount:
            raise HTTPException(status_code=400, detail="Refund amount exceeds payment amount")
        
        # Process refund
        await process_refund(payment, payload.reason, refund_amount)
        
        return {"status": "REFUND_INITIATED", "refund_amount": refund_amount}

@app.get("/payments/{payment_id}", response_model=PaymentResponseSchema)
async def get_payment(payment_id: str):
    """Get payment details"""
    async with AsyncSessionLocal() as session:
        payment = await session.execute(
            sa.select(Payment).where(Payment.payment_id == payment_id)
        )
        payment = payment.scalar_one_or_none()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return payment

@app.get("/payments/order/{order_id}", response_model=List[PaymentResponseSchema])
async def get_payments_by_order(order_id: int):
    """Get all payments for an order"""
    async with AsyncSessionLocal() as session:
        payments = await session.execute(
            sa.select(Payment).where(Payment.order_id == order_id).order_by(Payment.created_at.desc())
        )
        payments = payments.scalars().all()
        return payments

@app.post("/webhook/{gateway_name}")
async def payment_webhook(gateway_name: str, payload: dict):
    """Handle payment gateway webhooks"""
    try:
        # Verify webhook signature (implementation depends on gateway)
        # For demo, we'll assume it's valid
        
        transaction_id = payload.get("transaction_id")
        status = payload.get("status")
        payment_id = payload.get("payment_id")
        
        async with AsyncSessionLocal() as session:
            payment = await session.execute(
                sa.select(Payment).where(Payment.payment_id == payment_id)
            )
            payment = payment.scalar_one_or_none()
            
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            # Update payment status based on webhook
            payment.status = status.upper()
            payment.gateway_transaction_id = transaction_id
            payment.gateway_response = json.dumps(payload)
            
            await session.commit()
            
            # Emit event based on status
            event_data = {
                "payment_id": payment.payment_id,
                "order_id": payment.order_id,
                "order_number": payment.order_number,
                "status": payment.status,
                "transaction_id": transaction_id
            }
            
            if payment.status == "COMPLETED":
                await producer.send_and_wait("payment.completed", json.dumps(event_data).encode())
            elif payment.status == "FAILED":
                await producer.send_and_wait("payment.failed", json.dumps(event_data).encode())
            
            return {"status": "webhook_processed"}
            
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "payment",
        "timestamp": datetime.utcnow().isoformat()
    }