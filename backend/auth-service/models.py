from sqlalchemy import Column, String, Integer, Enum, DateTime, func
from common.db import Base
import enum

class UserRole(enum.Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"
    DELIVERY = "delivery"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    # email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
