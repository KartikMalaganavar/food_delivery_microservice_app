from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, func, Enum
from common.db import Base
import enum


class OrderStatus(enum.Enum):
    PLACED = "PLACED"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer = Column(String(100), nullable=False)
    restaurant_id = Column(Integer, nullable=False)
    items = Column(JSON, nullable=False)  # [{item_id, name, price, qty}]
    total = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PLACED, nullable=False)
    delivery_partner = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
