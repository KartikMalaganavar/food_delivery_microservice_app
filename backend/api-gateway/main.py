# # api-gateway/main.py
# from fastapi import FastAPI, Request
# import httpx
# import os

# app = FastAPI(title="API Gateway")

# SERVICE_MAP = {
#     "auth": os.getenv("AUTH_URL", "http://auth-service:8001"),
#     "restaurant": os.getenv("RESTAURANT_URL", "http://restaurant-service:8002"),
#     "order": os.getenv("ORDER_URL", "http://order-service:8003"),
#     "delivery": os.getenv("DELIVERY_URL", "http://delivery-service:8004"),
#     "payment": os.getenv("PAYMENT_URL", "http://payment-service:8005"),
# }

# async def proxy_to(service_base, path: str, request: Request):
#     url = service_base + path
#     async with httpx.AsyncClient() as client:
#         resp = await client.request(
#             request.method, url,
#             content=await request.body(),
#             headers=request.headers,
#             params=request.query_params,
#             timeout=30.0
#         )
#         return resp

# @app.api_route("/auth/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
# async def proxy_auth(path: str, request: Request):
#     resp = await proxy_to(SERVICE_MAP["auth"], f"/{path}", request)
#     return resp.json()

# @app.api_route("/restaurants/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
# async def proxy_restaurants(path: str, request: Request):
#     resp = await proxy_to(SERVICE_MAP["restaurant"], f"/{path}", request)
#     return resp.json()

# @app.api_route("/orders/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
# async def proxy_orders(path: str, request: Request):
#     resp = await proxy_to(SERVICE_MAP["order"], f"/{path}", request)
#     return resp.json()

# @app.api_route("/payments/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
# async def proxy_payments(path: str, request: Request):
#     resp = await proxy_to(SERVICE_MAP["payment"], f"/{path}", request)
#     return resp.json()



# api-gateway/main.py
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os
from common.jwt_utils import decode_token  # Shared JWT library
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://13.49.176.39:5173",
]

app = FastAPI(title="API Gateway")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] ,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

SERVICE_MAP = {
    "auth": os.getenv("AUTH_URL", "http://localhost:8001"),
    "restaurant": os.getenv("RESTAURANT_URL", "http://localhost:8002"),
    "order": os.getenv("ORDER_URL", "http://localhost:8003"),
    "delivery": os.getenv("DELIVERY_URL", "http://localhost:8004"),
    "payment": os.getenv("PAYMENT_URL", "http://localhost:8005"),
}

# Public endpoints that don't require authentication
PUBLIC_ENDPOINTS = {
    "/auth/login",
    "/auth/signup",
    "/auth/verify",
    "/docs",
    "/openapi.json"
}

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
        
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def proxy_to(service_base: str, path: str, request: Request, user_data: dict = None):
    url = service_base + path
    
    # Prepare headers - forward auth info to services
    headers = dict(request.headers)
    
    # Add user context for services (remove sensitive info)
    if user_data:
        headers["X-User-ID"] = user_data.get("sub", "")
        headers["X-User-Role"] = user_data.get("role", "")
        # Remove original authorization header if you want services to use X- headers
        # del headers["authorization"]
    
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            request.method, url,
            content=await request.body(),
            headers=headers,
            params=request.query_params,
            timeout=30.0
        )
        return resp

def should_authenticate(path: str) -> bool:
    """Check if the path requires authentication"""
    return not any(path.startswith(public) for public in PUBLIC_ENDPOINTS)


# Add this new endpoint for token verification
@app.get("/auth/verify")
async def verify_token_endpoint(user_data: dict = Depends(verify_token)):
    """Verify JWT token and return user data"""
    return {
        "user": {
            "username": user_data.get("sub"),
            "role": user_data.get("role")
        },
        "valid": True
    }

# Auth endpoints - no authentication required
@app.api_route("/auth/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_auth(path: str, request: Request):
    resp = await proxy_to(SERVICE_MAP["auth"], f"/{path}", request)
    return resp.json()

# Protected endpoints
@app.api_route("/restaurants/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_restaurants(path: str, request: Request, user_data: dict = Depends(verify_token)):
    resp = await proxy_to(SERVICE_MAP["restaurant"], f"/{path}", request, user_data)
    return resp.json()

@app.api_route("/orders/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_orders(path: str, request: Request, user_data: dict = Depends(verify_token)):
    resp = await proxy_to(SERVICE_MAP["order"], f"/{path}", request, user_data)
    return resp.json()

@app.api_route("/payments/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_payments(path: str, request: Request, user_data: dict = Depends(verify_token)):
    resp = await proxy_to(SERVICE_MAP["payment"], f"/{path}", request, user_data)
    return resp.json()

@app.api_route("/delivery/{path:path}", methods=["GET","POST","PATCH","PUT","DELETE"])
async def proxy_delivery(path: str, request: Request, user_data: dict = Depends(verify_token)):
    resp = await proxy_to(SERVICE_MAP["delivery"], f"/{path}", request, user_data)
    return resp.json()