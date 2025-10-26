# api-gateway/main.py
from fastapi import FastAPI, Request
import httpx
import os

app = FastAPI(title="API Gateway")

SERVICE_MAP = {
    "auth": os.getenv("AUTH_URL", "http://auth-service:8001"),
    "restaurant": os.getenv("RESTAURANT_URL", "http://restaurant-service:8002"),
    "order": os.getenv("ORDER_URL", "http://order-service:8003"),
    "delivery": os.getenv("DELIVERY_URL", "http://delivery-service:8004"),
    "payment": os.getenv("PAYMENT_URL", "http://payment-service:8005"),
}

async def proxy_to(service_base, path: str, request: Request):
    url = service_base + path
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            request.method, url,
            content=await request.body(),
            headers=request.headers,
            params=request.query_params,
            timeout=30.0
        )
        return resp

@app.api_route("/auth/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_auth(path: str, request: Request):
    resp = await proxy_to(SERVICE_MAP["auth"], f"/{path}", request)
    return resp.json()

@app.api_route("/restaurants/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_restaurants(path: str, request: Request):
    resp = await proxy_to(SERVICE_MAP["restaurant"], f"/{path}", request)
    return resp.json()

@app.api_route("/orders/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_orders(path: str, request: Request):
    resp = await proxy_to(SERVICE_MAP["order"], f"/{path}", request)
    return resp.json()

@app.api_route("/payments/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_payments(path: str, request: Request):
    resp = await proxy_to(SERVICE_MAP["payment"], f"/{path}", request)
    return resp.json()
