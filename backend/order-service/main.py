# # order-service/main.py
# from fastapi import FastAPI, HTTPException, Header
# from pydantic import BaseModel
# from common.db import Base, engine, AsyncSessionLocal
# from sqlalchemy import Column, Integer, String, JSON, Float
# import sqlalchemy as sa
# import asyncio
# from common.kafka_utils import get_producer, stop_producer
# import json

# # In each microservice
# from common.jwt_utils import decode_token

# async def get_current_user(authorization: str = Header(None)):
#     if not authorization:
#         raise HTTPException(status_code=401, detail="Authorization header missing")
    
#     try:
#         token = authorization.replace("Bearer ", "")
#         payload = decode_token(token)
#         return payload
#     except Exception:
#         raise HTTPException(status_code=401, detail="Invalid token")

# # Or using X-Headers from gateway
# async def get_user_from_headers(
#     x_user_id: str = Header(None),
#     x_user_role: str = Header(None)
# ):
#     if not x_user_id:
#         raise HTTPException(status_code=401, detail="User context missing")
#     return {"sub": x_user_id, "role": x_user_role}




# class Order(Base):
#     __tablename__ = "orders"
#     id = Column(Integer, primary_key=True, index=True)
#     customer = Column(String)
#     restaurant_id = Column(Integer)
#     items = Column(JSON)  # list of {item_id, name, price, qty}
#     total = Column(Float)
#     status = Column(String, default="PLACED") # PLACED -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED -> CANCELLED
#     delivery_partner = Column(String, nullable=True)

# class PlaceOrderSchema(BaseModel):
#     customer: str
#     restaurant_id: int
#     items: list
#     total: float

# app = FastAPI(title="Order Service")
# producer = None

# @app.on_event("startup")
# async def startup():
#     global producer
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
#     producer = await get_producer()

# @app.on_event("shutdown")
# async def shutdown():
#     global producer
#     if producer:
#         await stop_producer(producer)

# @app.post("/orders")
# async def place_order(p: PlaceOrderSchema):
#     async with AsyncSessionLocal() as session:
#         new = Order(customer=p.customer, restaurant_id=p.restaurant_id, items=p.items, total=p.total, status="PLACED")
#         session.add(new)
#         await session.commit()
#         await session.refresh(new)
#         # emit kafka event
#         payload = json.dumps({"order_id": new.id, "restaurant_id": new.restaurant_id, "status": new.status, "items": new.items})
#         await producer.send_and_wait("order.created", payload.encode("utf-8"))
#         return {"order_id": new.id, "status": new.status}

# @app.get("/orders/{order_id}")
# async def get_order(order_id: int):
#     async with AsyncSessionLocal() as session:
#         q = await session.execute(sa.select(Order).where(Order.id == order_id))
#         row = q.scalar_one_or_none()
#         if not row:
#             raise HTTPException(404, "not found")
#         return row

# @app.patch("/orders/{order_id}/status")
# async def update_status(order_id: int, status: str):
#     async with AsyncSessionLocal() as session:
#         q = await session.execute(sa.select(Order).where(Order.id == order_id))
#         row = q.scalar_one_or_none()
#         if not row:
#             raise HTTPException(404, "not found")
#         row.status = status
#         session.add(row)
#         await session.commit()
#         # kafka event
#         payload = json.dumps({"order_id": order_id, "status": status})
#         await producer.send_and_wait("order.updated", payload.encode("utf-8"))
#         return {"ok": True}


# order-service/main.py
from fastapi import FastAPI, HTTPException, Header, Depends, status
from pydantic import BaseModel, validator
from typing import List, Optional
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, JSON, Float, DateTime
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from datetime import datetime
import asyncio
from common.kafka_utils import get_producer, stop_producer, start_consumer
import json
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Authentication dependencies
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_user_from_headers(
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_user_role: str = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User context missing")
    return {"sub": x_user_id, "role": x_user_role}

# Extended Order Model
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True)  # Human-readable order ID
    customer_id = Column(String, nullable=False)  # Use username from auth
    customer_name = Column(String)  # Could be stored from user profile
    restaurant_id = Column(Integer, nullable=False)
    restaurant_name = Column(String)  # Could be stored from restaurant service
    items = Column(JSON)  # list of {item_id, name, price, qty, special_instructions}
    total = Column(Float, nullable=False)
    status = Column(String, default="PLACED")
    delivery_address = Column(JSON)  # {street, city, zip_code, instructions}
    delivery_partner_id = Column(String, nullable=True)
    delivery_partner_name = Column(String, nullable=True)
    estimated_delivery_time = Column(DateTime, nullable=True)
    special_instructions = Column(String, nullable=True)
    payment_status = Column(String, default="PENDING")  # PENDING, PAID, FAILED, REFUNDED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Schemas
class OrderItemSchema(BaseModel):
    item_id: int
    name: str
    price: float
    quantity: int
    special_instructions: Optional[str] = None

    @validator('quantity')
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

class DeliveryAddressSchema(BaseModel):
    street: str
    city: str
    zip_code: str
    instructions: Optional[str] = None

class PlaceOrderSchema(BaseModel):
    restaurant_id: int
    items: List[OrderItemSchema]
    delivery_address: DeliveryAddressSchema
    special_instructions: Optional[str] = None

    @validator('items')
    def items_non_empty(cls, v):
        if not v:
            raise ValueError('Order must contain at least one item')
        return v

class UpdateOrderStatusSchema(BaseModel):
    status: str
    delivery_partner_id: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None

class AssignDeliverySchema(BaseModel):
    delivery_partner_id: str
    delivery_partner_name: str
    estimated_delivery_time: datetime

# Response Schemas
class OrderResponseSchema(BaseModel):
    id: int
    order_number: str
    customer_id: str
    restaurant_id: int
    items: List[dict]
    total: float
    status: str
    delivery_address: dict
    payment_status: str
    created_at: datetime
    estimated_delivery_time: Optional[datetime] = None

    class Config:
        from_attributes = True


async def handle_payment_completed(data: dict):
    """Handle payment completion - order is now confirmed for delivery"""

    logger.info(f"Received : payment.completed event {data}")

    # Update status in orders, if payment is completed
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(Order).where(Order.id == data["order_id"])
        )
        order = order.scalar_one_or_none()
        
        if order and order.payment_status == "PENDING":
            order.payment_status = "COMPLETED"
            await session.commit()

async def handle_order_updated(order_data: dict):
    """Handle order updates from restaurant service"""
    async with AsyncSessionLocal() as session:
        # Find existing order
        result = await session.execute(
            sa.select(Order).where(
                Order.id == order_data["order_id"]
            )
        )
        order = result.scalar_one_or_none()
        
        if order:
            # Update status based on the incoming status from restaurant service
            # Map restaurant service status to order service status
            status_mapping = {
                "CONFIRMED": "CONFIRMED",      # Restaurant confirmed the order
                "PREPARING": "PREPARING",      # Restaurant started preparing
                "READY": "READY",              # Order is ready for pickup
                "COMPLETED": "COMPLETED",      # Order completed (if restaurant marks it)
                "CANCELLED": "CANCELLED"       # Restaurant cancelled the order
            }
            
            new_status = status_mapping.get(order_data["status"])
            
            if new_status:
                # Only update if status is valid and different from current
                if order.status != new_status:
                    order.status = new_status
                    order.updated_at = datetime.utcnow()
                    
                    await session.commit()

            print(f"Order {order_data['order_id']} updated to {order_data['status']}")



app = FastAPI(title="Order Service")
producer = None

def generate_order_number():
    return f"ORD-{uuid.uuid4().hex[:8].upper()}"

async def handle_event(topic: str, value: bytes):
    """Handles Kafka messages and triggers appropriate notifications."""
    try:
        data = json.loads(value.decode())
        logger.info(f"📩 Received : topic={topic} | data={data}")

        # Route to appropriate notification handler
        # if topic == "order.created":
        #     await handle_order_created(data)
        if topic == "order.updated":
            await handle_order_updated(data)
        elif topic == "payment.completed":
            await handle_payment_completed(data)
        # elif topic == "payment.failed":
        #     await handle_payment_failed(data)
        # elif topic == "payment.refunded":
        #     await handle_payment_refunded(data)
        # elif topic == "delivery.assigned":
        #     await handle_delivery_assigned(data)
        # elif topic == "delivery.status_updated":
        #     await handle_delivery_status_updated(data)

    except Exception as e:
        logger.error(f"❌ Failed to process message from {topic}: {e}")


@app.on_event("startup")
async def startup():

   

    asyncio.create_task(start_consumer(
        "payment.completed",
        group_id="order-group", 
        message_handler=handle_event
    ))

    asyncio.create_task(start_consumer(
        "order.updated", 
        group_id="order-group", 
        message_handler=handle_event
    ))


    global producer
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    producer = await get_producer()

@app.on_event("shutdown")
async def shutdown():
    global producer
    if producer:
        await stop_producer(producer)





# Order Endpoints
# @app.post("/orders", status_code=status.HTTP_201_CREATED, response_model=OrderResponseSchema)
# async def place_order(
#     order_data: PlaceOrderSchema,
#     user_data: dict = Depends(get_user_from_headers)  # From API Gateway headers
# ):
#     """
#     Place a new order
#     - customer_id comes from authenticated user (X-User-ID header)
#     - Calculate total from items
#     - Generate order number
#     """
#     async with AsyncSessionLocal() as session:
#         # Calculate total
#         total = sum(item.price * item.quantity for item in order_data.items)
        
#         # Create order
#         new_order = Order(
#             order_number=generate_order_number(),
#             customer_id=user_data["sub"],  # From authenticated user
#             customer_name=user_data["sub"],  # In real app, fetch from user service
#             restaurant_id=order_data.restaurant_id,
#             restaurant_name=f"Restaurant {order_data.restaurant_id}",  # Fetch from restaurant service
#             items=[item.dict() for item in order_data.items],
#             total=total,
#             delivery_address=order_data.delivery_address.dict(),
#             special_instructions=order_data.special_instructions,
#             status="PLACED",
#             payment_status="PENDING"
#         )
        
#         session.add(new_order)
#         await session.commit()
#         await session.refresh(new_order)
        
#         # Emit Kafka event
#         event_payload = {
#             "order_id": new_order.id,
#             "order_number": new_order.order_number,
#             "customer_id": new_order.customer_id,
#             "restaurant_id": new_order.restaurant_id,
#             "total": new_order.total,
#             "status": new_order.status,
#             "items": new_order.items
#         }
#         await producer.send_and_wait("order.created", json.dumps(event_payload).encode("utf-8"))
        
#         return new_order
# In your order service place_order endpoint
@app.post("/orders", status_code=status.HTTP_201_CREATED, response_model=OrderResponseSchema)
async def place_order(
    order_data: PlaceOrderSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    async with AsyncSessionLocal() as session:
        # Calculate total
        total = sum(item.price * item.quantity for item in order_data.items)
        
        # Create order
        new_order = Order(
            order_number=generate_order_number(),
            customer_id=user_data["sub"],
            customer_name=user_data.get("name", "Customer"),  # Get from user data
            restaurant_id=order_data.restaurant_id,
            restaurant_name=f"Restaurant {order_data.restaurant_id}",  # Fetch from restaurant service
            items=[item.dict() for item in order_data.items],
            total=total,
            delivery_address=order_data.delivery_address.dict(),
            special_instructions=order_data.special_instructions,
            status="PLACED",
            payment_status="PENDING"
        )
        
        session.add(new_order)
        await session.commit()
        await session.refresh(new_order)
        
        # Enhanced event payload for restaurant service
        event_payload = {
            "order_id": new_order.id,
            "order_number": new_order.order_number,
            "customer_id": new_order.customer_id,
            "customer_name": new_order.customer_name,
            "restaurant_id": new_order.restaurant_id,
            "restaurant_name": new_order.restaurant_name,
            "total": float(new_order.total),  # Ensure JSON serializable
            "status": new_order.status,
            "items": new_order.items,
            "special_instructions": new_order.special_instructions,
            "delivery_address": new_order.delivery_address,
            "created_at": new_order.created_at.isoformat() if new_order.created_at else None
        }
        
        await producer.send_and_wait("order.created", json.dumps(event_payload).encode("utf-8"))
        
        return new_order

@app.get("/orders/{order_id}", response_model=OrderResponseSchema)
async def get_order(
    order_id: int,
    user_data: dict = Depends(get_user_from_headers)
):
    """
    Get order details
    - Customers can only see their own orders
    - Restaurant staff can see orders for their restaurant
    - Admin/Delivery can see relevant orders
    """
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(Order).where(Order.id == order_id)
        )
        order = order.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Authorization check
        user_role = user_data.get("role")
        user_id = user_data.get("sub")
        
        if user_role == "customer" and order.customer_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif user_role == "restaurant" and order.restaurant_id != int(user_id):
            # Assuming restaurant_id in auth matches restaurant ID
            raise HTTPException(status_code=403, detail="Access denied")
        
        return order

@app.get("/orders", response_model=List[OrderResponseSchema])
async def list_orders(
    user_data: dict = Depends(get_user_from_headers),
    status_filter: Optional[str] = None,
    restaurant_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50
):
    """
    List orders with filters based on user role
    """
    async with AsyncSessionLocal() as session:
        query = sa.select(Order)
        user_role = user_data.get("role")
        user_id = user_data.get("sub")
        
        # Role-based filtering
        if user_role == "customer":
            query = query.where(Order.customer_id == user_id)
        elif user_role == "restaurant":
            query = query.where(Order.restaurant_id == int(user_id))
        elif user_role == "delivery":
            query = query.where(Order.delivery_partner_id == user_id)
        # Admin can see all orders
        
        # Additional filters
        if status_filter:
            query = query.where(Order.status == status_filter)
        if restaurant_id:
            query = query.where(Order.restaurant_id == restaurant_id)
        
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        
        result = await session.execute(query)
        orders = result.scalars().all()
        return orders

@app.patch("/orders/{order_id}/status", response_model=OrderResponseSchema)
async def update_order_status(
    order_id: int,
    status_data: UpdateOrderStatusSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """
    Update order status
    - Restaurant can update to: CONFIRMED, PREPARING, READY, CANCELLED
    - Delivery can update to: OUT_FOR_DELIVERY, DELIVERED
    """
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(Order).where(Order.id == order_id)
        )
        order = order.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate status transition based on user role
        valid_transitions = {
            "restaurant": ["CONFIRMED", "PREPARING", "READY", "CANCELLED"],
            "delivery": ["OUT_FOR_DELIVERY", "DELIVERED"],
            "admin": ["PLACED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
        }
        
        user_role = user_data.get("role")
        if user_role not in valid_transitions or status_data.status not in valid_transitions[user_role]:
            raise HTTPException(status_code=403, detail="Invalid status transition for your role")
        
        # Update order
        order.status = status_data.status
        if status_data.delivery_partner_id:
            order.delivery_partner_id = status_data.delivery_partner_id
        if status_data.estimated_delivery_time:
            order.estimated_delivery_time = status_data.estimated_delivery_time
        
        order.updated_at = datetime.utcnow()
        await session.commit()
        
        # Kafka event
        event_payload = {
            "order_id": order_id,
            "order_number": order.order_number,
            "status": order.status,
            "previous_status": order.status,  # You might want to track this
            "updated_by": user_data.get("sub")
        }
        await producer.send_and_wait("order.status_updated", json.dumps(event_payload).encode("utf-8"))
        
        return order

@app.post("/orders/{order_id}/assign-delivery", response_model=OrderResponseSchema)
async def assign_delivery_partner(
    order_id: int,
    assignment: AssignDeliverySchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """
    Assign delivery partner to order
    - Only restaurant staff or admin can assign
    - Order must be in READY status
    """
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(Order).where(Order.id == order_id)
        )
        order = order.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.status != "READY":
            raise HTTPException(status_code=400, detail="Order must be READY to assign delivery")
        
        # Check user permissions
        user_role = user_data.get("role")
        if user_role not in ["restaurant", "admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Assign delivery
        order.delivery_partner_id = assignment.delivery_partner_id
        order.delivery_partner_name = assignment.delivery_partner_name
        order.estimated_delivery_time = assignment.estimated_delivery_time
        order.status = "ASSIGNED"
        order.updated_at = datetime.utcnow()
        
        await session.commit()
        
        # Kafka event
        event_payload = {
            "order_id": order_id,
            "order_number": order.order_number,
            "delivery_partner_id": assignment.delivery_partner_id,
            "estimated_delivery_time": assignment.estimated_delivery_time.isoformat()
        }
        await producer.send_and_wait("order.delivery_assigned", json.dumps(event_payload).encode("utf-8"))
        
        return order

@app.get("/users/me/orders", response_model=List[OrderResponseSchema])
async def get_my_orders(
    user_data: dict = Depends(get_user_from_headers),
    skip: int = 0,
    limit: int = 20
):
    """
    Get current user's orders (for customers)
    """
    async with AsyncSessionLocal() as session:
        query = sa.select(Order).where(
            Order.customer_id == user_data.get("sub")
        ).order_by(Order.created_at.desc()).offset(skip).limit(limit)
        
        result = await session.execute(query)
        orders = result.scalars().all()
        return orders

@app.patch("/orders/{order_id}/payment-status")
async def update_payment_status(
    order_id: int,
    payment_status: str,
    user_data: dict = Depends(get_user_from_headers)
):
    """
    Update payment status (called by payment service webhook)
    """
    valid_statuses = ["PENDING", "PAID", "FAILED", "REFUNDED"]
    if payment_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(Order).where(Order.id == order_id)
        )
        order = order.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order.payment_status = payment_status
        order.updated_at = datetime.utcnow()
        
        # If payment failed, you might want to cancel the order
        if payment_status == "FAILED":
            order.status = "CANCELLED"
        
        await session.commit()
        
        # Kafka event
        event_payload = {
            "order_id": order_id,
            "order_number": order.order_number,
            "payment_status": payment_status
        }
        await producer.send_and_wait("order.payment_updated", json.dumps(event_payload).encode("utf-8"))
        
        return {"ok": True, "message": "Payment status updated"}