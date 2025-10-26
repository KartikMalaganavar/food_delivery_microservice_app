# auth-service/main.py
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from common.db import Base, engine, AsyncSessionLocal
from common.jwt_utils import create_access_token, decode_token
from sqlalchemy import Column, Integer, String, text
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

# User table for auth (simple)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="customer")  # customer / restaurant / delivery / admin

# Pydantic
class SignupSchema(BaseModel):
    username: str
    password: str
    role: str = "customer"

class LoginSchema(BaseModel):
    username: str
    password: str

app = FastAPI(title="Auth Service")

@app.on_event("startup")
async def startup():
    # create tables for dev
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.post("/signup")
async def signup(payload: SignupSchema):
    async with AsyncSessionLocal() as session:
        existing = await session.execute(text(
            "SELECT * FROM users WHERE username = :u"), {"u": payload.username}
        )
        # quick check (use ORM in real code)
        res = existing.first()
        if res:
            raise HTTPException(status_code=400, detail="username exists")
        new = User(username=payload.username, hashed_password=payload.password, role=payload.role)
        session.add(new)
        await session.commit()
        return {"ok": True, "msg": "created"}

@app.post("/login")
async def login(payload: LoginSchema):
    async with AsyncSessionLocal() as session:
        q = await session.execute(text("SELECT id, username, hashed_password, role FROM users WHERE username = :u"), {"u": payload.username})
        row = q.first()
        if not row or row.hashed_password != payload.password:
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = create_access_token({"sub": row.username, "role": row.role})
        return {"access_token": token}
