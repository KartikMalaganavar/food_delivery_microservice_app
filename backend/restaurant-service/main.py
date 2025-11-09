# # restaurant-service/main.py
# from fastapi import FastAPI, Depends, HTTPException, Header
# from pydantic import BaseModel
# from common.db import Base, engine, AsyncSessionLocal
# from sqlalchemy import Column, Integer, String, Float, Text
# from sqlalchemy.ext.asyncio import AsyncSession
# import sqlalchemy as sa
# import asyncio

# class Restaurant(Base):
#     __tablename__ = "restaurants"
#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String, unique=True, index=True)
#     address = Column(String)

# class MenuItem(Base):
#     __tablename__ = "menu_items"
#     id = Column(Integer, primary_key=True, index=True)
#     restaurant_id = Column(Integer, index=True)
#     name = Column(String)
#     description = Column(Text)
#     price = Column(Float)
#     available = Column(sa.Boolean, default=True)

# class MenuItemSchema(BaseModel):
#     restaurant_id: int
#     name: str
#     description: str = ""
#     price: float
#     available: bool = True

# app = FastAPI(title="Restaurant Service")

# @app.on_event("startup")
# async def startup():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)

# @app.post("/restaurants")
# async def create_restaurant(r: dict):
#     async with AsyncSessionLocal() as session:
#         new = Restaurant(**r)
#         session.add(new)
#         await session.commit()
#         return {"ok": True}

# @app.get("/restaurants")
# async def list_restaurants():
#     async with AsyncSessionLocal() as session:
#         q = await session.execute(sa.select(Restaurant))
#         rows = q.scalars().all()
#         return rows

# @app.post("/menu")
# async def add_menu_item(item: MenuItemSchema):
#     async with AsyncSessionLocal() as session:
#         new = MenuItem(**item.dict())
#         session.add(new)
#         await session.commit()
#         return {"ok": True}

# @app.get("/menu/{restaurant_id}")
# async def get_menu(restaurant_id: int):
#     async with AsyncSessionLocal() as session:
#         q = await session.execute(sa.select(MenuItem).where(MenuItem.restaurant_id == restaurant_id))
#         return q.scalars().all()



# restaurant-service/main.py
from fastapi import FastAPI, Depends, HTTPException, Header, status, Query
from pydantic import BaseModel, validator
from typing import List, Optional
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from datetime import datetime
import asyncio, json
from common.kafka_utils import get_producer, stop_producer
from aiokafka import AIOKafkaConsumer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
producer = None
consumer = None

async def consume_order_events():
    consumer = AIOKafkaConsumer(
        "order.created",
        "order.updated",
        "order.cancelled",
        "payment.completed",
        bootstrap_servers='localhost:9092',
        group_id="restaurant-service-group",
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    await consumer.start()
    try:
        async for msg in consumer:
            if msg.topic == "order.created":
                await handle_order_created(msg.value)
            elif msg.topic == "order.updated":
                await handle_order_updated(msg.value)
            elif msg.topic == "order.cancelled":
                await handle_order_cancelled(msg.value)
            elif msg.topic == "payment.completed":
                await handle_payment_completed(msg.value)
    finally:
        await consumer.stop()

async def handle_order_created(order_data: dict):
    """Handle new order creation from order service"""
    async with AsyncSessionLocal() as session:
        # Create restaurant order record
        restaurant_order = RestaurantOrder(
            order_id=order_data["order_id"],
            restaurant_id=order_data["restaurant_id"],
            customer_id=order_data["customer_id"],
            items=order_data["items"],
            total_amount=order_data["total"],
            status="RECEIVED",  # Map to restaurant service status
            delivery_address = order_data["delivery_address"],
            estimated_preparation_time=calculate_preparation_time(order_data["items"])
        )
        
        session.add(restaurant_order)
        await session.commit()
        print(f"Restaurant order created for order {order_data['order_id']}")

async def handle_payment_completed(data: dict):
    """Handle payment completion - order is now confirmed for delivery"""

    logger.info(f"Received : payment.completed event {data}")

    # Update status in orders, if payment is completed
    async with AsyncSessionLocal() as session:
        order = await session.execute(
            sa.select(RestaurantOrder).where(RestaurantOrder.order_id == data["order_id"])
        )
        order = order.scalar_one_or_none()
        
        if order and order.payment_status == "PENDING":
            order.payment_status = "COMPLETED"
            await session.commit()


async def handle_order_updated(order_data: dict):
    """Handle order updates from order service"""
    async with AsyncSessionLocal() as session:
        # Find existing restaurant order
        result = await session.execute(
            sa.select(RestaurantOrder).where(
                RestaurantOrder.order_id == order_data["order_id"]
            )
        )
        restaurant_order = result.scalar_one_or_none()
        
        if restaurant_order:
            # Update status based on order service status
            status_mapping = {
                "CONFIRMED": "RECEIVED",
                "PREPARING": "PREPARING", 
                "READY": "READY",
                "COMPLETED": "COMPLETED",
                "CANCELLED": "CANCELLED"
            }
            
            restaurant_order.status = status_mapping.get(
                order_data["status"], 
                restaurant_order.status
            )
            restaurant_order.updated_at = datetime.utcnow()
            
            await session.commit()
            print(f"Restaurant order {order_data['order_id']} updated to {order_data['status']}")

async def handle_order_cancelled(order_data: dict):
    """Handle order cancellation"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            sa.select(RestaurantOrder).where(
                RestaurantOrder.order_id == order_data["order_id"]
            )
        )
        restaurant_order = result.scalar_one_or_none()
        
        if restaurant_order:
            restaurant_order.status = "CANCELLED"
            restaurant_order.updated_at = datetime.utcnow()
            await session.commit()

def calculate_preparation_time(items: list) -> int:
    """Calculate estimated preparation time based on items"""
    # Simple calculation - in real app, this would be more sophisticated
    base_time = 10  # minutes
    item_time = len(items) * 5
    return base_time + item_time

# Authentication dependency (consistent with other services)
async def get_user_from_headers(
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_user_role: str = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User context missing")
    return {"sub": x_user_id, "role": x_user_role}

# Extended Models
class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, nullable=False, index=True)  # From auth service
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    address = Column(JSON)  # {street, city, state, zip_code, coordinates}
    phone = Column(String)
    email = Column(String)
    cuisine_type = Column(String)  # Italian, Chinese, Indian, etc.
    opening_hours = Column(JSON)  # {monday: {open: "09:00", close: "22:00"}, ...}
    delivery_time = Column(String)  # "30-40 min"
    min_order_amount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=2.99)
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    image_url = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, nullable=False, index=True)
    category = Column(String, nullable=False)  # Appetizers, Main Course, Desserts, etc.
    name = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    image_url = Column(String)
    ingredients = Column(JSON)  # List of ingredients
    dietary_info = Column(JSON)  # {vegetarian: true, gluten_free: false, etc.}
    calories = Column(Integer)
    preparation_time = Column(Integer)  # in minutes
    available = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RestaurantOrder(Base):
    __tablename__ = "restaurant_orders"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)  # From order service
    restaurant_id = Column(Integer, nullable=False, index=True)
    customer_id = Column(String, nullable=False)
    items = Column(JSON)  # List of ordered items with details
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="RECEIVED")  # RECEIVED, PREPARING, READY, COMPLETED, CANCELLED
    payment_status = Column(String, default="PENDING")  # PENDING, PROCESSING, COMPLETED 
    special_instructions = Column(Text)
    estimated_preparation_time = Column(Integer)  # in minutes
    actual_preparation_time = Column(Integer)  # in minutes
    delivery_address = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Schemas
class RestaurantCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    address: dict
    phone: str
    email: str
    cuisine_type: str
    opening_hours: dict
    delivery_time: str = "30-40 min"
    min_order_amount: float = 0.0
    delivery_fee: float = 2.99
    image_url: Optional[str] = None

class AddressSchema(BaseModel):
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]

class DayHours(BaseModel):
    open: str
    close: str

class OpeningHoursSchema(BaseModel):
    monday: Optional[DayHours]
    tuesday: Optional[DayHours]
    wednesday: Optional[DayHours]
    thursday: Optional[DayHours]
    friday: Optional[DayHours]
    saturday: Optional[DayHours]
    sunday: Optional[DayHours]

class RestaurantUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[AddressSchema] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    cuisine_type: Optional[str] = None
    opening_hours: Optional[OpeningHoursSchema] = None
    delivery_time: Optional[str] = None
    min_order_amount: Optional[float] = None
    delivery_fee: Optional[float] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class MenuItemCreateSchema(BaseModel):
    restaurant_id: int
    category: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    ingredients: Optional[List[str]] = None
    dietary_info: Optional[dict] = None
    calories: Optional[int] = None
    preparation_time: Optional[int] = None
    available: bool = True
    is_featured: bool = False

    @validator('price')
    def price_positive(cls, v):
        if v <= 0:
            raise ValueError('Price must be positive')
        return v

class MenuItemUpdateSchema(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    ingredients: Optional[List[str]] = None
    dietary_info: Optional[dict] = None
    calories: Optional[int] = None
    preparation_time: Optional[int] = None
    available: Optional[bool] = None
    is_featured: Optional[bool] = None

class RestaurantResponseSchema(BaseModel):
    id: int
    owner_id: str
    name: str
    description: Optional[str]
    address: dict
    phone: str
    email: str
    cuisine_type: str
    opening_hours: dict
    delivery_time: str
    min_order_amount: float
    delivery_fee: float
    rating: float
    total_ratings: int
    image_url: Optional[str]
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True

class MenuItemResponseSchema(BaseModel):
    id: int
    restaurant_id: int
    category: str
    name: str
    description: Optional[str]
    price: float
    image_url: Optional[str]
    ingredients: List[str]
    dietary_info: dict
    calories: Optional[int]
    preparation_time: Optional[int]
    available: bool
    is_featured: bool

    class Config:
        from_attributes = True

app = FastAPI(title="Restaurant Service")



@app.on_event("startup")
async def startup():

    
    asyncio.create_task(consume_order_events())

    global producer
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    producer = await get_producer()

@app.on_event("shutdown")
async def shutdown():

    if consumer:
        await consumer.stop()
    global producer
    if producer:
        await stop_producer(producer)

# Restaurant Endpoints
@app.post("/restaurants", status_code=status.HTTP_201_CREATED, response_model=RestaurantResponseSchema)
async def create_restaurant(
    restaurant_data: RestaurantCreateSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Create a new restaurant - only for users with restaurant role"""
    if user_data.get("role") not in ["restaurant", "admin"]:
        raise HTTPException(status_code=403, detail="Only restaurant owners or admin can create restaurants")
    
    async with AsyncSessionLocal() as session:
        # Check if restaurant name already exists
        existing = await session.execute(
            sa.select(Restaurant).where(Restaurant.name == restaurant_data.name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Restaurant name already exists")
        
        # Create restaurant
        restaurant = Restaurant(
            owner_id=user_data.get("sub"),
            **restaurant_data.dict()
        )
        session.add(restaurant)
        await session.commit()
        await session.refresh(restaurant)
        
        return restaurant

@app.get("/restaurants", response_model=List[RestaurantResponseSchema])
async def list_restaurants(
    cuisine_type: Optional[str] = Query(None),
    is_active: bool = Query(True),
    skip: int = Query(0),
    limit: int = Query(50)
):
    """Get list of restaurants with filtering"""
    async with AsyncSessionLocal() as session:
        query = sa.select(Restaurant).where(Restaurant.is_active == is_active)
        
        if cuisine_type:
            query = query.where(Restaurant.cuisine_type == cuisine_type)
        
        query = query.offset(skip).limit(limit).order_by(Restaurant.name)
        
        result = await session.execute(query)
        restaurants = result.scalars().all()
        return restaurants

@app.get("/restaurants/{restaurant_id}", response_model=RestaurantResponseSchema)
async def get_restaurant(restaurant_id: int):
    """Get restaurant details by ID"""
    async with AsyncSessionLocal() as session:
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        return restaurant

@app.put("/restaurants/{restaurant_id}", response_model=RestaurantResponseSchema)
async def update_restaurant(
    restaurant_id: int,
    restaurant_data: RestaurantUpdateSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Update restaurant details - only owner or admin"""

    print("Entered", restaurant_data)

    async with AsyncSessionLocal() as session:
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to update this restaurant")
        
        # Update fields
        update_data = restaurant_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(restaurant, field, value)
        
        restaurant.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(restaurant)
        
        return restaurant

@app.get("/my-restaurants", response_model=List[RestaurantResponseSchema])
async def get_my_restaurants(user_data: dict = Depends(get_user_from_headers)):
    """Get restaurants owned by the current user"""
    if user_data.get("role") not in ["restaurant", "admin"]:
        raise HTTPException(status_code=403, detail="Only restaurant owners can access this endpoint")
    
    async with AsyncSessionLocal() as session:
        query = sa.select(Restaurant)
        
        # Restaurant owners see only their restaurants, admin sees all
        if user_data.get("role") == "restaurant":
            query = query.where(Restaurant.owner_id == user_data.get("sub"))
        
        query = query.order_by(Restaurant.created_at.desc())
        
        result = await session.execute(query)
        restaurants = result.scalars().all()
        return restaurants

# Menu Item Endpoints
@app.post("/menu-items", status_code=status.HTTP_201_CREATED, response_model=MenuItemResponseSchema)
async def create_menu_item(
    menu_item_data: MenuItemCreateSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Create a new menu item - only restaurant owner or admin"""
    async with AsyncSessionLocal() as session:
        # Verify restaurant exists and user has access
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == menu_item_data.restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to add items to this restaurant")
        
        # Create menu item
        menu_item = MenuItem(**menu_item_data.dict())
        session.add(menu_item)
        await session.commit()
        await session.refresh(menu_item)
        
        return menu_item

@app.get("/menu-items/{restaurant_id}", response_model=List[MenuItemResponseSchema])
async def get_restaurant_menu(
    restaurant_id: int,
    category: Optional[str] = Query(None),
    available_only: bool = Query(True)
):
    """Get menu for a specific restaurant"""
    async with AsyncSessionLocal() as session:
        query = sa.select(MenuItem).where(MenuItem.restaurant_id == restaurant_id)
        
        if available_only:
            query = query.where(MenuItem.available == True)
        
        if category:
            query = query.where(MenuItem.category == category)
        
        query = query.order_by(MenuItem.category, MenuItem.sort_order, MenuItem.name)
        
        result = await session.execute(query)
        menu_items = result.scalars().all()
        return menu_items

@app.put("/menu-items/{menu_item_id}", response_model=MenuItemResponseSchema)
async def update_menu_item(
    menu_item_id: int,
    menu_item_data: MenuItemUpdateSchema,
    user_data: dict = Depends(get_user_from_headers)
):
    """Update menu item - only restaurant owner or admin"""
    async with AsyncSessionLocal() as session:
        menu_item = await session.execute(
            sa.select(MenuItem).where(MenuItem.id == menu_item_id)
        )
        menu_item = menu_item.scalar_one_or_none()
        
        if not menu_item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        # Get restaurant to check ownership
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == menu_item.restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to update this menu item")
        
        # Update fields
        update_data = menu_item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(menu_item, field, value)
        
        menu_item.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(menu_item)
        
        return menu_item

@app.delete("/menu-items/{menu_item_id}")
async def delete_menu_item(
    menu_item_id: int,
    user_data: dict = Depends(get_user_from_headers)
):
    """Delete menu item - only restaurant owner or admin"""
    async with AsyncSessionLocal() as session:
        menu_item = await session.execute(
            sa.select(MenuItem).where(MenuItem.id == menu_item_id)
        )
        menu_item = menu_item.scalar_one_or_none()
        
        if not menu_item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        # Get restaurant to check ownership
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == menu_item.restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to delete this menu item")
        
        await session.delete(menu_item)
        await session.commit()
        
        return {"status": "DELETED", "menu_item_id": menu_item_id}

# # Restaurant Order Management Endpoints
# @app.get("/restaurants/{restaurant_id}/orders")
# async def get_restaurant_orders(
#     restaurant_id: int,
#     status: Optional[str] = Query(None),
#     user_data: dict = Depends(get_user_from_headers)
# ):
#     """Get orders for a specific restaurant - only owner or admin"""
#     async with AsyncSessionLocal() as session:
#         # Verify restaurant exists and user has access
#         restaurant = await session.execute(
#             sa.select(Restaurant).where(Restaurant.id == restaurant_id)
#         )
#         restaurant = restaurant.scalar_one_or_none()
        
#         if not restaurant:
#             raise HTTPException(status_code=404, detail="Restaurant not found")
        
#         # Authorization check
#         if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
#             raise HTTPException(status_code=403, detail="Not authorized to view orders for this restaurant")
        
#         # In real implementation, this would query the order service
#         # For now, return mock data or integrate with order service
#         return {"message": "Order integration with order service needed"}
@app.get("/restaurants/{restaurant_id}/orders")
async def get_restaurant_orders(
    restaurant_id: int,
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_data: dict = Depends(get_user_from_headers)
):
    """Get orders for a specific restaurant - only owner or admin"""
    async with AsyncSessionLocal() as session:
        # Verify restaurant exists and user has access
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to view orders for this restaurant")
        
        # Build query
        query = sa.select(RestaurantOrder).where(
            RestaurantOrder.restaurant_id == restaurant_id
        )
        
        if status:
            query = query.where(RestaurantOrder.status == status)
        
        # Order by creation date, newest first
        query = query.order_by(RestaurantOrder.created_at.desc())
        
        # Add pagination
        query = query.offset(skip).limit(limit)
        
        result = await session.execute(query)
        orders = result.scalars().all()
        
        return {
            "orders": orders,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": len(orders)
            }
        }

@app.patch("/restaurants/{restaurant_id}/orders/{order_id}/status")
async def update_order_status(
    restaurant_id: int,
    order_id: int,
    status_update: dict,
    user_data: dict = Depends(get_user_from_headers)
):
    valid_statuses = ["RECEIVED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]
    

    """Update order status from restaurant side"""
    async with AsyncSessionLocal() as session:
        # Verify authorization
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Find restaurant order
        result = await session.execute(
            sa.select(RestaurantOrder).where(
                RestaurantOrder.id == order_id,
                RestaurantOrder.restaurant_id == restaurant_id
            )
        )
        restaurant_order = result.scalar_one_or_none()
        
        if not restaurant_order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update status
        restaurant_order.status = status_update["status"]
        restaurant_order.updated_at = datetime.utcnow()
        
        # If completed, set actual preparation time
        if status_update["status"] == "COMPLETED":
            preparation_time = (datetime.utcnow() - restaurant_order.created_at).total_seconds() / 60
            restaurant_order.actual_preparation_time = int(preparation_time)
        
        await session.commit()
        
        # Emit event back to order service about status change
        event_payload = {
            "order_id": restaurant_order.order_id,
            "restaurant_id": restaurant_id,
            "status": status_update["status"],
            "updated_at": restaurant_order.updated_at.isoformat(),
            "delivery_address": restaurant_order.delivery_address
        }
        await producer.send_and_wait("order.updated", json.dumps(event_payload).encode("utf-8"))
        
        return {"message": "Order status updated successfully"}


@app.post("/restaurants/{restaurant_id}/orders/{order_id}/status")
async def update_order_status(
    restaurant_id: int,
    order_id: int,
    status: str,
    user_data: dict = Depends(get_user_from_headers)
):
    """Update order status - only restaurant owner or admin"""
    valid_statuses = ["CONFIRMED", "PREPARING", "READY", "CANCELLED"]
    
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    async with AsyncSessionLocal() as session:
        # Verify restaurant exists and user has access
        restaurant = await session.execute(
            sa.select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        restaurant = restaurant.scalar_one_or_none()
        
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Authorization check
        if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
            raise HTTPException(status_code=403, detail="Not authorized to update orders for this restaurant")
        


        # Emit Kafka event to update order status
        event_data = {
            "order_id": order_id,
            "status": status,
            "updated_by": user_data.get("sub"),
            "restaurant_id": restaurant_id
        }
        await producer.send_and_wait("order.updated", json.dumps(event_data).encode())
        
        return {"status": "UPDATED", "order_id": order_id, "new_status": status}

# @app.post("/restaurants/{restaurant_id}/orders/{order_id}/status")
# async def update_order_status(
#     restaurant_id: int,
#     order_id: int,
#     status: str,
#     user_data: dict = Depends(get_user_from_headers),
# ):
#     """Update restaurant order status (DB + Kafka)"""
#     valid_statuses = ["RECEIVED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]

#     if status not in valid_statuses:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Invalid status. Must be one of: {valid_statuses}",
#         )

#     async with AsyncSessionLocal() as session:
#         # Verify restaurant exists
#         result = await session.execute(
#             sa.select(Restaurant).where(Restaurant.id == restaurant_id)
#         )
#         restaurant = result.scalar_one_or_none()
#         if not restaurant:
#             raise HTTPException(status_code=404, detail="Restaurant not found")

#         # Authorization check
#         if user_data.get("role") != "admin" and restaurant.owner_id != user_data.get("sub"):
#             raise HTTPException(status_code=403, detail="Not authorized to update orders for this restaurant")

#         # Get the order from DB
#         result = await session.execute(
#             sa.select(RestaurantOrder).where(
#                 RestaurantOrder.restaurant_id == restaurant_id,
#                 RestaurantOrder.order_id == order_id
#             )
#         )
#         order = result.scalar_one_or_none()

#         if not order:
#             raise HTTPException(status_code=404, detail="Order not found")

#         # Update order status and timestamp
#         order.status = status
#         order.updated_at = datetime.utcnow()

#         await session.commit()

#         # Emit Kafka event to notify other services
#         event_data = {
#             "order_id": order_id,
#             "restaurant_id": restaurant_id,
#             "status": status,
#             "updated_by": user_data.get("sub"),
#             "timestamp": order.updated_at.isoformat()
#         }
#         await producer.send_and_wait("order.updated", json.dumps(event_data).encode())

#         return {
#             "message": "Order status updated successfully",
#             "order_id": order_id,
#             "restaurant_id": restaurant_id,
#             "new_status": status
#         }


# Search and Filter Endpoints
@app.get("/restaurants/search")
async def search_restaurants(
    query: str = Query(None),
    cuisine_type: str = Query(None),
    min_rating: float = Query(None),
    skip: int = Query(0),
    limit: int = Query(20)
):
    """Search restaurants by name or cuisine"""
    async with AsyncSessionLocal() as session:
        search_query = sa.select(Restaurant).where(Restaurant.is_active == True)
        
        if query:
            search_query = search_query.where(
                Restaurant.name.ilike(f"%{query}%") |
                Restaurant.cuisine_type.ilike(f"%{query}%")
            )
        
        if cuisine_type:
            search_query = search_query.where(Restaurant.cuisine_type == cuisine_type)
        
        if min_rating:
            search_query = search_query.where(Restaurant.rating >= min_rating)
        
        search_query = search_query.offset(skip).limit(limit).order_by(Restaurant.rating.desc())
        
        result = await session.execute(search_query)
        restaurants = result.scalars().all()
        return restaurants

@app.get("/categories/{restaurant_id}")
async def get_menu_categories(restaurant_id: int):
    """Get unique menu categories for a restaurant"""
    async with AsyncSessionLocal() as session:
        categories = await session.execute(
            sa.select(MenuItem.category).where(
                MenuItem.restaurant_id == restaurant_id,
                MenuItem.available == True
            ).distinct()
        )
        categories = categories.scalars().all()
        return {"categories": categories}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "restaurant",
        "timestamp": datetime.utcnow().isoformat()
    }