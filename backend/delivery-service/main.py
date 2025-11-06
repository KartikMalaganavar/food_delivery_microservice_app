# # delivery-service/main.py
# from fastapi import FastAPI
# import asyncio, json
# from common.kafka_utils import start_consumer, get_producer, stop_producer
# from common.db import Base, engine, AsyncSessionLocal
# from sqlalchemy import Column, Integer, String
# import sqlalchemy as sa

# class DeliveryAssignment(Base):
#     __tablename__ = "delivery_assignments"
#     id = Column(Integer, primary_key=True)
#     order_id = Column(Integer)
#     partner = Column(String)
#     status = Column(String, default="PENDING")

# app = FastAPI(title="Delivery Service")

# async def handle_message(topic, value):
#     data = json.loads(value.decode())
#     # if order updated to READY -> create assignment
#     if topic == "order.updated":
#         order_id = data.get("order_id")
#         status = data.get("status")
#         if status == "READY":
#             async with AsyncSessionLocal() as session:
#                 new = DeliveryAssignment(order_id=order_id, partner=None, status="ASSIGNED")
#                 session.add(new)
#                 await session.commit()
#             # notify via kafka for notifications/emitter
#             prod = await get_producer()
#             await prod.send_and_wait("delivery.assigned", json.dumps({"order_id": order_id}).encode())
#             await stop_producer(prod)

# @app.on_event("startup")
# async def startup():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
#     # start consumer loop in background
#     asyncio.create_task(start_consumer("order.updated", group_id="delivery-group", message_handler=handle_message))



# delivery-service/main.py
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from datetime import datetime
import asyncio
import json
from common.kafka_utils import start_consumer, get_producer, stop_producer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Authentication dependency (consistent with other services)
async def get_user_from_headers(
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_user_role: str = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User context missing")
    return {"sub": x_user_id, "role": x_user_role}

# Extended Delivery Assignment Model
class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    order_number = Column(String, index=True)
    customer_id = Column(String, nullable=False)
    customer_name = Column(String)
    customer_phone = Column(String)
    restaurant_id = Column(Integer, nullable=False)
    restaurant_name = Column(String)
    restaurant_address = Column(JSON)  # {street, city, zip_code, coordinates}
    delivery_address = Column(JSON)  # {street, city, zip_code, instructions, coordinates}
    delivery_partner_id = Column(String, nullable=True)  # From auth service
    delivery_partner_name = Column(String, nullable=True)
    delivery_partner_phone = Column(String, nullable=True)
    status = Column(String, default="PENDING")  # PENDING, ASSIGNED, ACCEPTED, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED
    estimated_pickup_time = Column(DateTime, nullable=True)
    estimated_delivery_time = Column(DateTime, nullable=True)
    actual_pickup_time = Column(DateTime, nullable=True)
    actual_delivery_time = Column(DateTime, nullable=True)
    delivery_fee = Column(Float, default=0.0)
    total_distance_km = Column(Float, nullable=True)
    special_instructions = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Schemas
class AssignDeliverySchema(BaseModel):
    delivery_partner_id: str
    delivery_partner_name: str
    delivery_partner_phone: str

class UpdateDeliveryStatusSchema(BaseModel):
    status: str
    notes: Optional[str] = None

class DeliveryResponseSchema(BaseModel):
    id: int
    order_id: int
    order_number: str
    customer_name: str
    restaurant_name: str
    delivery_address: dict
    delivery_partner_name: Optional[str] = None
    status: str
    estimated_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    delivery_fee: float
    created_at: datetime

    class Config:
        from_attributes = True

class DeliveryPartnerResponseSchema(BaseModel):
    partner_id: str
    name: str
    phone: str
    status: str  # AVAILABLE, BUSY, OFFLINE
    current_location: Optional[dict] = None
    active_deliveries: int

app = FastAPI(title="Delivery Service")

# Global variables
producer = None

@app.on_event("startup")
async def startup():
    global producer
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    producer = await get_producer()
    
    # Start Kafka consumers for various order events
    asyncio.create_task(start_consumer(
        "order.updated", 
        group_id="delivery-group", 
        message_handler=handle_order_updated
    ))
    asyncio.create_task(start_consumer(
        "order.created",
        group_id="delivery-group",
        message_handler=handle_order_created
    ))
    asyncio.create_task(start_consumer(
        "payment.completed",
        group_id="delivery-group", 
        message_handler=handle_payment_completed
    ))

@app.on_event("shutdown")
async def shutdown():
    global producer
    if producer:
        await stop_producer(producer)

# Kafka Message Handlers
async def handle_order_updated(topic, value):
    """Handle order status updates"""
    data = json.loads(value.decode())
    order_id = data.get("order_id")
    status = data.get("status")
    order_number = data.get("order_number", "")
    
    if status == "READY":
        async with AsyncSessionLocal() as session:
            # Check if delivery assignment already exists
            existing = await session.execute(
                sa.select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id)
            )
            existing = existing.scalar_one_or_none()
            
            if not existing:
                # Create new delivery assignment
                new_assignment = DeliveryAssignment(
                    order_id=order_id,
                    order_number=order_number,
                    customer_id=data.get("customer_id", ""),
                    customer_name=f"Customer {data.get('customer_id', '')}",
                    customer_phone="+1234567890",  # In real app, fetch from user service
                    restaurant_id=data.get("restaurant_id", 0),
                    restaurant_name=f"Restaurant {data.get('restaurant_id', '')}",
                    restaurant_address={},  # Fetch from restaurant service
                    delivery_address=data.get("delivery_address", {}),
                    status="PENDING",
                    delivery_fee=calculate_delivery_fee(data.get("total_distance_km", 5.0))
                )
                session.add(new_assignment)
                await session.commit()
                
                # Notify about new delivery assignment
                event_data = {
                    "delivery_id": new_assignment.id,
                    "order_id": order_id,
                    "order_number": order_number,
                    "restaurant_id": new_assignment.restaurant_id,
                    "delivery_address": new_assignment.delivery_address,
                    "status": "PENDING"
                }
                await producer.send_and_wait("delivery.assigned", json.dumps(event_data).encode())

async def handle_order_created(topic, value):
    """Handle new order creation - prepare delivery assignment"""
    data = json.loads(value.decode())
    # We might want to create a preliminary delivery assignment here
    # but wait for payment confirmation and restaurant readiness

async def handle_payment_completed(topic, value):
    """Handle payment completion - order is now confirmed for delivery"""


    data = json.loads(value.decode())
    order_id = data.get("order_id")
    
    logger.info(f"Received : payment.completed event {data}")

    # Update delivery assignment status if payment is completed
    async with AsyncSessionLocal() as session:
        assignment = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id)
        )
        assignment = assignment.scalar_one_or_none()
        
        if assignment and assignment.status == "PENDING":
            assignment.status = "WAITING_FOR_RESTAURANT"
            await session.commit()

def calculate_delivery_fee(distance_km: float, base_fee: float = 2.0, per_km: float = 0.5) -> float:
    """Calculate delivery fee based on distance"""
    return base_fee + (distance_km * per_km)

# API Endpoints
@app.get("/deliveries/available", response_model=List[DeliveryResponseSchema])
async def get_available_deliveries(user_data: dict = Depends(get_user_from_headers)):
    """Get available deliveries for delivery partners"""
    if user_data.get("role") != "delivery":
        raise HTTPException(status_code=403, detail="Only delivery partners can access this endpoint")
    
    async with AsyncSessionLocal() as session:
        deliveries = await session.execute(
            sa.select(DeliveryAssignment).where(
                DeliveryAssignment.status.in_(["PENDING", "ASSIGNED"])
            ).order_by(DeliveryAssignment.created_at.desc())
        )
        deliveries = deliveries.scalars().all()
        return deliveries

@app.get("/deliveries/assigned", response_model=List[DeliveryResponseSchema])
async def get_my_deliveries(user_data: dict = Depends(get_user_from_headers)):
    """Get deliveries assigned to current delivery partner"""
    if user_data.get("role") != "delivery":
        raise HTTPException(status_code=403, detail="Only delivery partners can access this endpoint")
    
    delivery_partner_id = user_data.get("sub")
    
    async with AsyncSessionLocal() as session:
        deliveries = await session.execute(
            sa.select(DeliveryAssignment).where(
                DeliveryAssignment.delivery_partner_id == delivery_partner_id,
                DeliveryAssignment.status.in_(["ASSIGNED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY"])
            ).order_by(DeliveryAssignment.created_at.desc())
        )
        deliveries = deliveries.scalars().all()
        return deliveries

@app.post("/deliveries/{delivery_id}/accept")
async def accept_delivery(
    delivery_id: int,
    user_data: dict = Depends(get_user_from_headers)
):
    """Delivery partner accepts a delivery assignment"""
    if user_data.get("role") != "delivery":
        raise HTTPException(status_code=403, detail="Only delivery partners can accept deliveries")
    
    async with AsyncSessionLocal() as session:
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery assignment not found")
        
        if delivery.status != "ASSIGNED":
            raise HTTPException(status_code=400, detail="Delivery is not available for acceptance")
        
        # Update delivery assignment
        delivery.delivery_partner_id = user_data.get("sub")
        delivery.delivery_partner_name = user_data.get("sub")  # In real app, fetch from user service
        delivery.delivery_partner_phone = "+1234567890"  # Fetch from user service
        delivery.status = "ACCEPTED"
        delivery.updated_at = datetime.utcnow()
        
        await session.commit()
        
        # Emit events
        event_data = {
            "delivery_id": delivery_id,
            "order_id": delivery.order_id,
            "order_number": delivery.order_number,
            "delivery_partner_id": delivery.delivery_partner_id,
            "status": "ACCEPTED"
        }
        await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        await producer.send_and_wait("order.updated", json.dumps({
            "order_id": delivery.order_id,
            "status": "ASSIGNED",
            "delivery_partner_id": delivery.delivery_partner_id,
            "delivery_partner_name": delivery.delivery_partner_name
        }).encode())
        
        return {"status": "ACCEPTED", "delivery_id": delivery_id}

@app.post("/deliveries/{delivery_id}/status")
async def update_delivery_status(
    delivery_id: int,
    status_data: UpdateDeliveryStatusSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Update delivery status (picked up, on the way, delivered, etc.)"""
    valid_transitions = {
        "delivery": ["ACCEPTED", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "CANCELLED"]
    }
    
    user_role = user_data.get("role")
    if user_role not in valid_transitions or status_data.status not in valid_transitions[user_role]:
        raise HTTPException(status_code=400, detail="Invalid status transition")
    
    async with AsyncSessionLocal() as session:
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery assignment not found")
        
        # Verify delivery partner owns this delivery
        if user_role == "delivery" and delivery.delivery_partner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
        
        previous_status = delivery.status
        delivery.status = status_data.status
        
        # Update timestamps based on status
        if status_data.status == "PICKED_UP":
            delivery.actual_pickup_time = datetime.utcnow()
        elif status_data.status == "DELIVERED":
            delivery.actual_delivery_time = datetime.utcnow()
        
        delivery.updated_at = datetime.utcnow()
        await session.commit()
        
        # Emit events
        event_data = {
            "delivery_id": delivery_id,
            "order_id": delivery.order_id,
            "order_number": delivery.order_number,
            "status": status_data.status,
            "previous_status": previous_status,
            "notes": status_data.notes
        }
        await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        
        # Also update order status
        order_status_map = {
            "PICKED_UP": "OUT_FOR_DELIVERY",
            "DELIVERED": "DELIVERED"
        }
        if status_data.status in order_status_map:
            await producer.send_and_wait("order.updated", json.dumps({
                "order_id": delivery.order_id,
                "status": order_status_map[status_data.status]
            }).encode())
        
        return {"status": "UPDATED", "delivery_id": delivery_id}

@app.get("/deliveries/{delivery_id}", response_model=DeliveryResponseSchema)
async def get_delivery_details(
    delivery_id: int,
    user_data: dict = Depends(get_user_from_headers)
):
    """Get detailed information about a specific delivery"""
    async with AsyncSessionLocal() as session:
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery assignment not found")
        
        # Authorization check
        user_role = user_data.get("role")
        user_id = user_data.get("sub")
        
        if user_role == "delivery" and delivery.delivery_partner_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this delivery")
        elif user_role == "customer" and delivery.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this delivery")
        
        return delivery

@app.get("/deliveries/order/{order_id}", response_model=DeliveryResponseSchema)
async def get_delivery_by_order(order_id: int, user_data: dict = Depends(get_user_from_headers)):
    """Get delivery assignment for a specific order"""
    async with AsyncSessionLocal() as session:
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="No delivery assignment found for this order")
        
        # Authorization check
        user_role = user_data.get("role")
        user_id = user_data.get("sub")
        
        if user_role == "customer" and delivery.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this delivery")
        
        return delivery

@app.post("/deliveries/{delivery_id}/assign")
async def assign_delivery_partner(
    delivery_id: int,
    assignment: AssignDeliverySchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Manually assign a delivery partner (admin/restaurant use)"""
    # Only admin or restaurant can manually assign
    if user_data.get("role") not in ["admin", "restaurant"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    async with AsyncSessionLocal() as session:
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery assignment not found")
        
        delivery.delivery_partner_id = assignment.delivery_partner_id
        delivery.delivery_partner_name = assignment.delivery_partner_name
        delivery.delivery_partner_phone = assignment.delivery_partner_phone
        delivery.status = "ASSIGNED"
        delivery.updated_at = datetime.utcnow()
        
        await session.commit()
        
        # Emit events
        event_data = {
            "delivery_id": delivery_id,
            "order_id": delivery.order_id,
            "delivery_partner_id": assignment.delivery_partner_id,
            "status": "ASSIGNED"
        }
        await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        
        return {"status": "ASSIGNED", "delivery_id": delivery_id}

@app.get("/delivery-partners/available")
async def get_available_delivery_partners():
    """Get list of available delivery partners"""
    # In a real implementation, this would query a delivery partner service
    # or maintain delivery partner status in this service
    return [
        {
            "partner_id": "delivery_1",
            "name": "John Delivery",
            "phone": "+1234567890",
            "status": "AVAILABLE",
            "active_deliveries": 0
        }
    ]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "delivery",
        "timestamp": datetime.utcnow().isoformat()
    }