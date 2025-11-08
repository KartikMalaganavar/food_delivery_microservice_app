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
# delivery-service/main.py - Add these models
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON
from datetime import datetime



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

class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"
    
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(String, unique=True, index=True)  # From auth service user_id
    username = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, default="AVAILABLE")  # AVAILABLE, BUSY, OFFLINE
    current_location = Column(JSON, nullable=True)  # {lat: xx, lng: xx}
    active_deliveries = Column(Integer, default=0)
    total_deliveries = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    vehicle_type = Column(String, nullable=True)  # bike, car, scooter, etc.
    vehicle_number = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
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
    asyncio.create_task(start_consumer(
        "user.registered",
        group_id="delivery-group",
        message_handler=handle_user_registered
    ))
    asyncio.create_task(start_consumer(
        "user.updated",
        group_id="delivery-group", 
        message_handler=handle_user_updated
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

# delivery-service/main.py - Update the message handlers
async def handle_user_registered(topic, value):
    """Handle new user registration events from auth service"""
    try:
        data = json.loads(value.decode())
        
        # Check if this is a delivery partner registration
        if data.get("role") == "delivery":
            async with AsyncSessionLocal() as session:
                # Check if partner already exists
                existing_partner = await session.execute(
                    sa.select(DeliveryPartner).where(
                        DeliveryPartner.partner_id == data.get("user_id")
                    )
                )
                existing_partner = existing_partner.scalar_one_or_none()
                
                if not existing_partner:
                    # Create new delivery partner
                    new_partner = DeliveryPartner(
                        partner_id=data.get("user_id"),
                        username=data.get("username"),
                        name=data.get("username"),  # Default to username
                        email=data.get("email", ""),
                        status="AVAILABLE",
                        active_deliveries=0,
                        total_deliveries=0,
                        total_earnings=0.0,
                        rating=0.0,
                        total_ratings=0,
                        is_active=True
                    )
                    session.add(new_partner)
                    await session.commit()
                    print(f"✅ Created delivery partner: {data.get('username')}")
                
    except Exception as e:
        print(f"❌ Error handling user registration: {e}")

async def handle_user_updated(topic, value):
    """Handle user profile updates"""
    try:
        data = json.loads(value.decode())
        user_id = data.get("user_id")
        
        if data.get("role") == "delivery":
            async with AsyncSessionLocal() as session:
                partner = await session.execute(
                    sa.select(DeliveryPartner).where(
                        DeliveryPartner.partner_id == user_id
                    )
                )
                partner = partner.scalar_one_or_none()
                
                if partner:
                    # Update partner details
                    if data.get("phone"):
                        partner.phone = data.get("phone")
                    if data.get("name"):
                        partner.name = data.get("name")
                    if data.get("email"):
                        partner.email = data.get("email")
                    
                    partner.updated_at = datetime.utcnow()
                    await session.commit()
                    print(f"✅ Updated delivery partner: {partner.username}")
                
    except Exception as e:
        print(f"❌ Error handling user update: {e}")

# Admin related endpoints
@app.get("/deliveries/available", response_model=List[DeliveryResponseSchema])
async def get_available_deliveries(user_data: dict = Depends(get_user_from_headers)):
    """Get available deliveries for delivery partners"""
    access = ["delivery", "admin"]
    if user_data.get("role") not in access:
        raise HTTPException(status_code=403, detail="Only delivery/admin partners can access this endpoint")
    
    async with AsyncSessionLocal() as session:
        deliveries = await session.execute(
            sa.select(DeliveryAssignment).where(
                DeliveryAssignment.status.in_(["PENDING", "ASSIGNED"])
            ).order_by(DeliveryAssignment.created_at.desc())
        )
        deliveries = deliveries.scalars().all()
        return deliveries

@app.get("/delivery-partners/available")
async def get_available_delivery_partners():
    """Get list of available delivery partners"""
    async with AsyncSessionLocal() as session:
        partners = await session.execute(
            sa.select(DeliveryPartner).where(
                DeliveryPartner.status == "AVAILABLE",
                DeliveryPartner.is_active == True
            ).order_by(
                DeliveryPartner.rating.desc(),
                DeliveryPartner.active_deliveries.asc()
            )
        )
        partners = partners.scalars().all()
        
        return [
            {
                "partner_id": partner.partner_id,
                "username": partner.username,
                "name": partner.name or partner.username,
                "phone": partner.phone or "Not provided",
                "email": partner.email or "Not provided",
                "status": partner.status,
                "active_deliveries": partner.active_deliveries,
                "total_deliveries": partner.total_deliveries,
                "total_earnings": partner.total_earnings,
                "rating": partner.rating,
                "vehicle_type": partner.vehicle_type,
                "is_verified": partner.is_verified
            }
            for partner in partners
        ]

@app.get("/deliveries/assigned", response_model=List[DeliveryResponseSchema])
async def get_my_deliveries(user_data: dict = Depends(get_user_from_headers)):
    """Get deliveries assigned to current delivery partner"""
    if user_data.get("role") not in ["restaurant", "admin"]:
        raise HTTPException(status_code=403, detail="Only delivery partners can access this endpoint")
    
    delivery_partner_id = user_data.get("sub")
    
    async with AsyncSessionLocal() as session:


        deliveries = None    
        if user_data.get("role") == "admin":
            deliveries = await session.execute(
                sa.select(DeliveryAssignment).where( 
                    DeliveryAssignment.status.in_(["ASSIGNED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY"])
                ).order_by(DeliveryAssignment.created_at.desc())
            )    
        else:
            deliveries = await session.execute(
                sa.select(DeliveryAssignment).where( 
                    DeliveryAssignment.delivery_partner_id == delivery_partner_id,
                    DeliveryAssignment.status.in_(["ASSIGNED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY"])
                ).order_by(DeliveryAssignment.created_at.desc())
            )
         
        deliveries = deliveries.scalars().all()
        
        return deliveries


@app.post("/deliveries/{delivery_id}/assign")
async def assign_delivery_partner(
    delivery_id: int,
    assignment: AssignDeliverySchema,
    user_data: dict = Depends(get_user_from_headers)
):

    #  Only admin or restaurant can manually assign
    if user_data.get("role") not in ["admin", "restaurant"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    

    """Manually assign a delivery partner to a delivery (Admin/Restaurant only)"""
    async with AsyncSessionLocal() as session:
        # Get delivery assignment
        delivery = await session.execute(
            sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
        )
        delivery = delivery.scalar_one_or_none()
        
        if not delivery:
            raise HTTPException(
                status_code=403,
                detail="Delivery assignment not found"
            )
        
        if delivery.status != "PENDING":
            raise HTTPException(
                status_code=403,
                detail="Delivery is not in PENDING status"
            )
        
        # Get delivery partner
        partner = await session.execute(
            sa.select(DeliveryPartner).where(
                DeliveryPartner.partner_id == assignment.delivery_partner_id,
                DeliveryPartner.is_active == True
            )
        )
        partner = partner.scalar_one_or_none()
        
        if not partner:
            raise HTTPException(
                status_code=404,
                detail="Delivery partner not found"
            )
        
        if partner.status != "AVAILABLE":
            raise HTTPException(
                status_code=400,
                detail="Delivery partner is not available"
            )
        
        # Update delivery assignment
        delivery.delivery_partner_id = partner.partner_id
        delivery.delivery_partner_name = partner.name
        delivery.delivery_partner_phone = partner.phone
        delivery.status = "ASSIGNED"
        delivery.updated_at = datetime.utcnow()
        
        # Update partner status
        partner.active_deliveries += 1
        partner.status = "BUSY"
        
        await session.commit()
        
        # Emit events
        event_data = {
            "delivery_id": delivery_id,
            "order_id": delivery.order_id,
            "delivery_partner_id": partner.partner_id,
            "delivery_partner_name": partner.name,
            "status": "ASSIGNED"
        }
        await producer.send_and_wait("delivery.assigned", json.dumps(event_data).encode())
        
        return {
            "message": "Delivery assigned successfully",
            "delivery_id": delivery_id,
            "delivery_partner_id": partner.partner_id,
            "delivery_partner_name": partner.name
        }


# @app.post("/deliveries/{delivery_id}/assign")
# async def assign_delivery_partner(
#     delivery_id: int,
#     assignment: AssignDeliverySchema,
#     user_data: dict = Depends(get_user_from_headers)
# ):
#     """Manually assign a delivery partner (admin/restaurant use)"""
#     # Only admin or restaurant can manually assign
#     if user_data.get("role") not in ["admin", "restaurant"]:
#         raise HTTPException(status_code=403, detail="Insufficient permissions")
    
#     async with AsyncSessionLocal() as session:
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(status_code=404, detail="Delivery assignment not found")
        
#         delivery.delivery_partner_id = assignment.delivery_partner_id
#         delivery.delivery_partner_name = assignment.delivery_partner_name
#         delivery.delivery_partner_phone = assignment.delivery_partner_phone
#         delivery.status = "ASSIGNED"
#         delivery.updated_at = datetime.utcnow()
        
#         await session.commit()
        
#         # Emit events
#         event_data = {
#             "delivery_id": delivery_id,
#             "order_id": delivery.order_id,
#             "delivery_partner_id": assignment.delivery_partner_id,
#             "status": "ASSIGNED"
#         }
#         await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        
#         return {"status": "ASSIGNED", "delivery_id": delivery_id}

#For Admin and delivery partner endpoint
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


# delivery partner endpoints
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
        
        if not delivery or delivery.status == "DELIVERED":
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

            # Update partner stats and mark as available
            if delivery.delivery_partner_id:
                partner = await session.execute(
                    sa.select(DeliveryPartner).where(
                        DeliveryPartner.partner_id == delivery.delivery_partner_id
                    )
                )
                partner = partner.scalar_one_or_none()
                if partner:
                    partner.active_deliveries = max(0, partner.active_deliveries - 1)
                    partner.total_deliveries += 1
                    partner.total_earnings += delivery.delivery_fee
                    if partner.active_deliveries == 0:
                        print("Avail :", partner.active_deliveries)
                        partner.status = "AVAILABLE"
        
        delivery.updated_at = datetime.utcnow()
        await session.commit()
        
        # Emit events
        # event_data = {
        #     "delivery_id": delivery_id,
        #     "order_id": delivery.order_id,
        #     "order_number": delivery.order_number,
        #     "status": status_data.status,
        #     "previous_status": previous_status,
        #     "notes": status_data.notes
        # }
        # await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())

        # event_data = {
        #     "delivery_id": delivery_id,
        #     "order_id": delivery.order_id,
        #     "order_number": delivery.order_number,
        #     "status": status_data.status,
        #     "previous_status": previous_status,
        #     "notes": status_data.notes
        # }
        # await producer.send_and_wait("order.updated", json.dumps(event_data).encode())

        
        
        # Also update order status
        order_status_map = {
            "ON_THE_WAY": "ON_THE_WAY",
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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "delivery",
        "timestamp": datetime.utcnow().isoformat()
    }




# # delivery-service/main.py
# from fastapi import FastAPI, HTTPException, Depends, Header, status
# from pydantic import BaseModel
# from typing import List, Optional
# from common.db import Base, engine, AsyncSessionLocal
# from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON
# from sqlalchemy.ext.asyncio import AsyncSession
# import sqlalchemy as sa
# from datetime import datetime
# import asyncio
# import json
# from common.kafka_utils import start_consumer, get_producer, stop_producer
# import logging

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Pydantic Schemas
# class AssignDeliverySchema(BaseModel):
#     delivery_partner_id: str

# class UpdateDeliveryStatusSchema(BaseModel):
#     status: str
#     notes: Optional[str] = None

# class DeliveryPartnerUpdateSchema(BaseModel):
#     status: Optional[str] = None
#     current_location: Optional[dict] = None
#     vehicle_type: Optional[str] = None
#     vehicle_number: Optional[str] = None

# class DeliveryResponseSchema(BaseModel):
#     id: int
#     order_id: int
#     order_number: str
#     customer_name: str
#     restaurant_name: str
#     delivery_address: dict
#     delivery_partner_name: Optional[str] = None
#     status: str
#     estimated_delivery_time: Optional[datetime] = None
#     actual_delivery_time: Optional[datetime] = None
#     delivery_fee: float
#     created_at: datetime

#     class Config:
#         from_attributes = True

# class DeliveryPartnerResponseSchema(BaseModel):
#     partner_id: str
#     name: str
#     phone: str
#     status: str
#     current_location: Optional[dict] = None
#     active_deliveries: int
#     total_deliveries: int
#     rating: float

#     class Config:
#         from_attributes = True

# # Database Models
# class DeliveryAssignment(Base):
#     __tablename__ = "delivery_assignments"
    
#     id = Column(Integer, primary_key=True, index=True)
#     order_id = Column(Integer, nullable=False, index=True)
#     order_number = Column(String, index=True)
#     customer_id = Column(String, nullable=False)
#     customer_name = Column(String)
#     customer_phone = Column(String)
#     restaurant_id = Column(Integer, nullable=False)
#     restaurant_name = Column(String)
#     restaurant_address = Column(JSON)
#     delivery_address = Column(JSON)
#     delivery_partner_id = Column(String, nullable=True)
#     delivery_partner_name = Column(String, nullable=True)
#     delivery_partner_phone = Column(String, nullable=True)
#     status = Column(String, default="PENDING")
#     estimated_pickup_time = Column(DateTime, nullable=True)
#     estimated_delivery_time = Column(DateTime, nullable=True)
#     actual_pickup_time = Column(DateTime, nullable=True)
#     actual_delivery_time = Column(DateTime, nullable=True)
#     delivery_fee = Column(Float, default=0.0)
#     total_distance_km = Column(Float, nullable=True)
#     special_instructions = Column(String, nullable=True)
#     created_at = Column(DateTime, default=datetime.utcnow)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# class DeliveryPartner(Base):
#     __tablename__ = "delivery_partners"
    
#     id = Column(Integer, primary_key=True, index=True)
#     partner_id = Column(String, unique=True, index=True)
#     username = Column(String, unique=True, index=True)
#     name = Column(String, nullable=True)
#     phone = Column(String, nullable=True)
#     email = Column(String, nullable=True)
#     status = Column(String, default="AVAILABLE")
#     current_location = Column(JSON, nullable=True)
#     active_deliveries = Column(Integer, default=0)
#     total_deliveries = Column(Integer, default=0)
#     total_earnings = Column(Float, default=0.0)
#     rating = Column(Float, default=0.0)
#     total_ratings = Column(Integer, default=0)
#     vehicle_type = Column(String, nullable=True)
#     vehicle_number = Column(String, nullable=True)
#     is_verified = Column(Boolean, default=False)
#     is_active = Column(Boolean, default=True)
#     created_at = Column(DateTime, default=datetime.utcnow)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# # Authentication & Authorization
# async def get_user_from_headers(
#     x_user_id: str = Header(..., alias="X-User-ID"),
#     x_user_role: str = Header(..., alias="X-User-Role")
# ):
#     """Extract user context from headers"""
#     return {"sub": x_user_id, "role": x_user_role}

# def require_role(required_roles: List[str]):
#     """Role-based authorization dependency"""
#     def role_checker(user_data: dict = Depends(get_user_from_headers)):
#         if user_data.get("role") not in required_roles:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Insufficient permissions"
#             )
#         return user_data
#     return role_checker

# # Service Functions
# class DeliveryService:
#     @staticmethod
#     def calculate_delivery_fee(distance_km: float, base_fee: float = 2.0, per_km: float = 0.5) -> float:
#         """Calculate delivery fee based on distance"""
#         return base_fee + (distance_km * per_km)

#     @staticmethod
#     def validate_status_transition(current_status: str, new_status: str, user_role: str) -> bool:
#         """Validate delivery status transitions"""
#         valid_transitions = {
#             "admin": ["PENDING", "ASSIGNED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "CANCELLED"],
#             "delivery": ["ACCEPTED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"]
#         }
#         return new_status in valid_transitions.get(user_role, [])

# # Kafka Message Handlers
# async def handle_order_updated(topic: str, value: bytes):
#     """Handle order status updates - create delivery assignment when order is READY"""
#     try:
#         data = json.loads(value.decode())
#         order_id = data.get("order_id")
#         status = data.get("status")
        
#         if status == "READY":
#             async with AsyncSessionLocal() as session:
#                 # Check if delivery assignment already exists
#                 existing = await session.execute(
#                     sa.select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id)
#                 )
#                 existing = existing.scalar_one_or_none()
                
#                 if not existing:
#                     # Create new delivery assignment (admin will manually assign)
#                     new_assignment = DeliveryAssignment(
#                         order_id=order_id,
#                         order_number=data.get("order_number", ""),
#                         customer_id=data.get("customer_id", ""),
#                         customer_name=f"Customer {data.get('customer_id', '')}",
#                         customer_phone=data.get("customer_phone", ""),
#                         restaurant_id=data.get("restaurant_id", 0),
#                         restaurant_name=data.get("restaurant_name", ""),
#                         restaurant_address=data.get("restaurant_address", {}),
#                         delivery_address=data.get("delivery_address", {}),
#                         status="PENDING",  # Admin will manually assign
#                         delivery_fee=DeliveryService.calculate_delivery_fee(
#                             data.get("total_distance_km", 5.0)
#                         ),
#                         total_distance_km=data.get("total_distance_km", 5.0)
#                     )
#                     session.add(new_assignment)
#                     await session.commit()
                    
#                     logger.info(f"Created delivery assignment for order {order_id}")
                    
#                     # Notify admin about pending delivery assignment
#                     producer = await get_producer()
#                     event_data = {
#                         "delivery_id": new_assignment.id,
#                         "order_id": order_id,
#                         "order_number": new_assignment.order_number,
#                         "restaurant_name": new_assignment.restaurant_name,
#                         "delivery_address": new_assignment.delivery_address,
#                         "status": "PENDING"
#                     }
#                     await producer.send_and_wait("delivery.pending", json.dumps(event_data).encode())
                    
#     except Exception as e:
#         logger.error(f"Error handling order update: {e}")

# async def handle_payment_completed(topic: str, value: bytes):
#     """Handle payment completion - order is confirmed"""
#     try:
#         data = json.loads(value.decode())
#         order_id = data.get("order_id")
        
#         logger.info(f"Payment completed for order {order_id}")
        
#     except Exception as e:
#         logger.error(f"Error handling payment completion: {e}")

# async def handle_user_registered(topic: str, value: bytes):
#     """Handle new delivery partner registration"""
#     try:
#         data = json.loads(value.decode())
        
#         if data.get("role") == "delivery":
#             async with AsyncSessionLocal() as session:
#                 existing_partner = await session.execute(
#                     sa.select(DeliveryPartner).where(
#                         DeliveryPartner.partner_id == data.get("user_id")
#                     )
#                 )
#                 existing_partner = existing_partner.scalar_one_or_none()
                
#                 if not existing_partner:
#                     new_partner = DeliveryPartner(
#                         partner_id=data.get("user_id"),
#                         username=data.get("username"),
#                         name=data.get("name", data.get("username")),
#                         email=data.get("email", ""),
#                         phone=data.get("phone", ""),
#                         status="AVAILABLE"
#                     )
#                     session.add(new_partner)
#                     await session.commit()
#                     logger.info(f"Registered delivery partner: {data.get('username')}")
                
#     except Exception as e:
#         logger.error(f"Error handling user registration: {e}")

# # FastAPI App
# app = FastAPI(title="Delivery Service", version="1.0.0")

# # Global variables
# producer = None

# @app.on_event("startup")
# async def startup():
#     """Initialize service on startup"""
#     global producer
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
    
#     producer = await get_producer()
    
#     # Start Kafka consumers
#     asyncio.create_task(start_consumer(
#         "order.updated", 
#         group_id="delivery-group", 
#         message_handler=handle_order_updated
#     ))
#     asyncio.create_task(start_consumer(
#         "payment.completed",
#         group_id="delivery-group", 
#         message_handler=handle_payment_completed
#     ))
#     asyncio.create_task(start_consumer(
#         "user.registered",
#         group_id="delivery-group",
#         message_handler=handle_user_registered
#     ))

# @app.on_event("shutdown")
# async def shutdown():
#     """Cleanup on shutdown"""
#     global producer
#     if producer:
#         await stop_producer(producer)

# # Delivery Assignment Endpoints (Admin managed)
# @app.get("/deliveries/pending", response_model=List[DeliveryResponseSchema])
# async def get_pending_deliveries(
#     user_data: dict = Depends(require_role(["admin", "restaurant"]))
# ):
#     """Get all pending deliveries (Admin/Restaurant only)"""
#     async with AsyncSessionLocal() as session:
#         deliveries = await session.execute(
#             sa.select(DeliveryAssignment).where(
#                 DeliveryAssignment.status == "PENDING"
#             ).order_by(DeliveryAssignment.created_at.desc())
#         )
#         deliveries = deliveries.scalars().all()
#         return deliveries

# @app.post("/deliveries/{delivery_id}/assign", status_code=status.HTTP_200_OK)
# async def assign_delivery_partner(
#     delivery_id: int,
#     assignment: AssignDeliverySchema,
#     user_data: dict = Depends(require_role(["admin", "restaurant"]))
# ):
#     """Manually assign a delivery partner to a delivery (Admin/Restaurant only)"""
#     async with AsyncSessionLocal() as session:
#         # Get delivery assignment
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery assignment not found"
#             )
        
#         if delivery.status != "PENDING":
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Delivery is not in PENDING status"
#             )
        
#         # Get delivery partner
#         partner = await session.execute(
#             sa.select(DeliveryPartner).where(
#                 DeliveryPartner.partner_id == assignment.delivery_partner_id,
#                 DeliveryPartner.is_active == True
#             )
#         )
#         partner = partner.scalar_one_or_none()
        
#         if not partner:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery partner not found"
#             )
        
#         if partner.status != "AVAILABLE":
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Delivery partner is not available"
#             )
        
#         # Update delivery assignment
#         delivery.delivery_partner_id = partner.partner_id
#         delivery.delivery_partner_name = partner.name
#         delivery.delivery_partner_phone = partner.phone
#         delivery.status = "ASSIGNED"
#         delivery.updated_at = datetime.utcnow()
        
#         # Update partner status
#         partner.active_deliveries += 1
#         partner.status = "BUSY"
        
#         await session.commit()
        
#         # Emit events
#         event_data = {
#             "delivery_id": delivery_id,
#             "order_id": delivery.order_id,
#             "delivery_partner_id": partner.partner_id,
#             "delivery_partner_name": partner.name,
#             "status": "ASSIGNED"
#         }
#         await producer.send_and_wait("delivery.assigned", json.dumps(event_data).encode())
        
#         return {
#             "message": "Delivery assigned successfully",
#             "delivery_id": delivery_id,
#             "delivery_partner_id": partner.partner_id,
#             "delivery_partner_name": partner.name
#         }

# # Delivery Partner Endpoints
# @app.get("/delivery-partners/available", response_model=List[DeliveryPartnerResponseSchema])
# async def get_available_delivery_partners(
#     user_data: dict = Depends(require_role(["admin", "restaurant"]))
# ):
#     """Get available delivery partners (Admin/Restaurant only)"""
#     async with AsyncSessionLocal() as session:
#         partners = await session.execute(
#             sa.select(DeliveryPartner).where(
#                 DeliveryPartner.status == "AVAILABLE",
#                 DeliveryPartner.is_active == True
#             ).order_by(
#                 DeliveryPartner.rating.desc(),
#                 DeliveryPartner.active_deliveries.asc()
#             )
#         )
#         partners = partners.scalars().all()
#         return partners

# @app.get("/deliveries/assigned", response_model=List[DeliveryResponseSchema])
# async def get_my_assigned_deliveries(
#     user_data: dict = Depends(require_role(["delivery"]))
# ):
#     """Get deliveries assigned to current delivery partner"""
#     delivery_partner_id = user_data.get("sub")
    
#     async with AsyncSessionLocal() as session:
#         deliveries = await session.execute(
#             sa.select(DeliveryAssignment).where(
#                 DeliveryAssignment.delivery_partner_id == delivery_partner_id,
#                 DeliveryAssignment.status.in_(["ASSIGNED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY"])
#             ).order_by(DeliveryAssignment.created_at.desc())
#         )
#         deliveries = deliveries.scalars().all()
#         return deliveries

# @app.post("/deliveries/{delivery_id}/accept", status_code=status.HTTP_200_OK)
# async def accept_delivery(
#     delivery_id: int,
#     user_data: dict = Depends(require_role(["delivery"]))
# ):
#     """Delivery partner accepts an assigned delivery"""
#     delivery_partner_id = user_data.get("sub")
    
#     async with AsyncSessionLocal() as session:
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(
#                 DeliveryAssignment.id == delivery_id,
#                 DeliveryAssignment.delivery_partner_id == delivery_partner_id
#             )
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery assignment not found or not assigned to you"
#             )
        
#         if delivery.status != "ASSIGNED":
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Delivery is not in ASSIGNED status"
#             )
        
#         delivery.status = "ACCEPTED"
#         delivery.updated_at = datetime.utcnow()
#         await session.commit()
        
#         # Emit event
#         event_data = {
#             "delivery_id": delivery_id,
#             "order_id": delivery.order_id,
#             "status": "ACCEPTED",
#             "delivery_partner_id": delivery_partner_id
#         }
#         await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        
#         return {
#             "message": "Delivery accepted successfully",
#             "delivery_id": delivery_id
#         }

# @app.post("/deliveries/{delivery_id}/status", status_code=status.HTTP_200_OK)
# async def update_delivery_status(
#     delivery_id: int,
#     status_data: UpdateDeliveryStatusSchema,
#     user_data: dict = Depends(require_role(["delivery", "admin"]))
# ):
#     """Update delivery status"""
#     user_role = user_data.get("role")
    
#     async with AsyncSessionLocal() as session:
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery assignment not found"
#             )
        
#         # Authorization check for delivery partners
#         if user_role == "delivery" and delivery.delivery_partner_id != user_data.get("sub"):
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Not authorized to update this delivery"
#             )
        
#         # Validate status transition
#         if not DeliveryService.validate_status_transition(
#             delivery.status, status_data.status, user_role
#         ):
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Invalid status transition"
#             )
        
#         previous_status = delivery.status
#         delivery.status = status_data.status
        
#         # Update timestamps
#         if status_data.status == "PICKED_UP":
#             delivery.actual_pickup_time = datetime.utcnow()
#         elif status_data.status == "DELIVERED":
#             delivery.actual_delivery_time = datetime.utcnow()
            
#             # Update partner stats and mark as available
#             if delivery.delivery_partner_id:
#                 partner = await session.execute(
#                     sa.select(DeliveryPartner).where(
#                         DeliveryPartner.partner_id == delivery.delivery_partner_id
#                     )
#                 )
#                 partner = partner.scalar_one_or_none()
#                 if partner:
#                     partner.active_deliveries = max(0, partner.active_deliveries - 1)
#                     partner.total_deliveries += 1
#                     partner.total_earnings += delivery.delivery_fee
#                     if partner.active_deliveries == 0:
#                         partner.status = "AVAILABLE"
        
#         delivery.updated_at = datetime.utcnow()
#         await session.commit()
        
#         # Emit events
#         event_data = {
#             "delivery_id": delivery_id,
#             "order_id": delivery.order_id,
#             "status": status_data.status,
#             "previous_status": previous_status,
#             "notes": status_data.notes
#         }
#         await producer.send_and_wait("delivery.status_updated", json.dumps(event_data).encode())
        
#         return {
#             "message": "Delivery status updated successfully",
#             "delivery_id": delivery_id,
#             "status": status_data.status
#         }

# # General Endpoints
# @app.get("/deliveries/{delivery_id}", response_model=DeliveryResponseSchema)
# async def get_delivery_details(
#     delivery_id: int,
#     user_data: dict = Depends(get_user_from_headers)
# ):
#     """Get delivery details with authorization"""
#     async with AsyncSessionLocal() as session:
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(DeliveryAssignment.id == delivery_id)
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery assignment not found"
#             )
        
#         # Authorization check
#         user_role = user_data.get("role")
#         user_id = user_data.get("sub")
        
#         if user_role == "delivery" and delivery.delivery_partner_id != user_id:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Not authorized to view this delivery"
#             )
#         elif user_role == "customer" and delivery.customer_id != user_id:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Not authorized to view this delivery"
#             )
        
#         return delivery

# @app.get("/deliveries/order/{order_id}", response_model=DeliveryResponseSchema)
# async def get_delivery_by_order(
#     order_id: int,
#     user_data: dict = Depends(get_user_from_headers)
# ):
#     """Get delivery assignment for a specific order"""
#     async with AsyncSessionLocal() as session:
#         delivery = await session.execute(
#             sa.select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id)
#         )
#         delivery = delivery.scalar_one_or_none()
        
#         if not delivery:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="No delivery assignment found for this order"
#             )
        
#         # Authorization check
#         user_role = user_data.get("role")
#         user_id = user_data.get("sub")
        
#         if user_role == "customer" and delivery.customer_id != user_id:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Not authorized to view this delivery"
#             )
        
#         return delivery

# # Delivery Partner Management
# @app.put("/delivery-partners/me", status_code=status.HTTP_200_OK)
# async def update_delivery_partner_profile(
#     update_data: DeliveryPartnerUpdateSchema,
#     user_data: dict = Depends(require_role(["delivery"]))
# ):
#     """Update delivery partner profile and status"""
#     delivery_partner_id = user_data.get("sub")
    
#     async with AsyncSessionLocal() as session:
#         partner = await session.execute(
#             sa.select(DeliveryPartner).where(
#                 DeliveryPartner.partner_id == delivery_partner_id
#             )
#         )
#         partner = partner.scalar_one_or_none()
        
#         if not partner:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Delivery partner not found"
#             )
        
#         # Update fields
#         if update_data.status:
#             partner.status = update_data.status
#         if update_data.current_location:
#             partner.current_location = update_data.current_location
#         if update_data.vehicle_type:
#             partner.vehicle_type = update_data.vehicle_type
#         if update_data.vehicle_number:
#             partner.vehicle_number = update_data.vehicle_number
        
#         partner.updated_at = datetime.utcnow()
#         await session.commit()
        
#         return {
#             "message": "Profile updated successfully",
#             "partner_id": delivery_partner_id
#         }

# @app.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     return {
#         "status": "healthy",
#         "service": "delivery",
#         "timestamp": datetime.utcnow().isoformat()
#     }