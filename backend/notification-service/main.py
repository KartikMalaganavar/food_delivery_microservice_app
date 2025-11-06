# from fastapi import FastAPI
# from contextlib import asynccontextmanager
# import asyncio
# import json
# from common.kafka_utils import start_consumer

# # List of Kafka topics to consume
# TOPICS = ["order.created", "order.updated", "delivery.assigned"]

# # Keep track of consumer tasks globally
# consumer_tasks = []


# async def handle_event(topic: str, value: bytes):
#     """Handles Kafka messages."""
#     try:
#         data = json.loads(value.decode())
#         print(f"📩 [NOTIFICATION] topic={topic} | data={data}")
#     except Exception as e:
#         print(f"❌ Failed to process message from {topic}: {e}")


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """Startup and shutdown management for FastAPI."""
#     print("🚀 Notification Service is starting...")

#     # Start Kafka consumers
#     for topic in TOPICS:
#         print(f"🧠 Starting consumer for topic: {topic}")
#         task = asyncio.create_task(start_consumer(topic, "notify-group", handle_event))
#         consumer_tasks.append(task)

#     # Wait a moment to confirm all consumers start
#     await asyncio.sleep(1)
#     print("✅ All Kafka consumers running!")

#     # Yield control to FastAPI (service is now live)
#     yield

#     # Shutdown phase — gracefully cancel all consumers
#     print("🛑 Shutting down Notification Service...")
#     for task in consumer_tasks:
#         task.cancel()
#     await asyncio.gather(*consumer_tasks, return_exceptions=True)
#     print("👋 All consumers stopped. Bye!")


# # Initialize app with lifespan
# app = FastAPI(title="Notification Service", lifespan=lifespan)


# notification-service/main.py
from fastapi import FastAPI, BackgroundTasks
from contextlib import asynccontextmanager
import asyncio
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr
import logging
from common.kafka_utils import start_consumer
from common.db import Base, engine, AsyncSessionLocal
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of Kafka topics to consume
TOPICS = [
    "order.created", 
    "order.updated", 
    "delivery.assigned",
    "delivery.status_updated",
    "payment.completed",
    "payment.failed",
    "payment.refunded"
]

# Keep track of consumer tasks globally
consumer_tasks = []

# # Database Model for Notification History
# class Notification(Base):
#     __tablename__ = "notifications"
#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(String, nullable=False, index=True)
#     user_email = Column(String, nullable=True)
#     user_phone = Column(String, nullable=True)
#     type = Column(String, nullable=False)  # email, sms, push
#     topic = Column(String, nullable=False)  # Kafka topic that triggered this
#     subject = Column(String, nullable=True)
#     message = Column(Text, nullable=False)
#     status = Column(String, default="PENDING")  # PENDING, SENT, FAILED
#     metadata = Column(JSON)  # Additional context data
#     created_at = Column(DateTime, default=datetime.utcnow)
#     sent_at = Column(DateTime, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    user_email = Column(String, nullable=True)
    user_phone = Column(String, nullable=True)
    type = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, default="PENDING")
    notification_data = Column(JSON)  # Renamed from 'metadata'
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)

# Pydantic Models
class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    html_body: Optional[str] = None

class SMSRequest(BaseModel):
    to_phone: str
    message: str

class PushNotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict] = None

# Notification Service Class
class NotificationService:
    def __init__(self):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_username = "your-email@gmail.com"
        self.smtp_password = "your-app-password"
        self.sms_gateway_url = "https://api.sms-gateway.com/send"
        self.sms_api_key = "your-sms-api-key"
        self.push_service_url = "https://fcm.googleapis.com/fcm/send"
        self.push_server_key = "your-fcm-server-key"

    async def send_email(self, email_request: EmailRequest) -> bool:
        """Send email notification"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = email_request.subject
            message["From"] = self.smtp_username
            message["To"] = email_request.to_email

            # Create the plain-text and HTML version of your message
            part1 = MIMEText(email_request.body, "plain")
            part2 = MIMEText(email_request.html_body or email_request.body, "html")

            # Add HTML/plain-text parts to MIMEMultipart message
            message.attach(part1)
            if email_request.html_body:
                message.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"📧 Email sent to {email_request.to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send email to {email_request.to_email}: {e}")
            return False

    async def send_sms(self, sms_request: SMSRequest) -> bool:
        """Send SMS notification"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "to": sms_request.to_phone,
                    "message": sms_request.message,
                    "api_key": self.sms_api_key
                }
                async with session.post(self.sms_gateway_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"📱 SMS sent to {sms_request.to_phone}")
                        return True
                    else:
                        logger.error(f"❌ SMS failed to {sms_request.to_phone}: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"❌ Failed to send SMS to {sms_request.to_phone}: {e}")
            return False

    async def send_push_notification(self, push_request: PushNotificationRequest) -> bool:
        """Send push notification"""
        try:
            headers = {
                "Authorization": f"key={self.push_server_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "to": f"/topics/user_{push_request.user_id}",  # or specific device token
                "notification": {
                    "title": push_request.title,
                    "body": push_request.body,
                    "icon": "ic_notification",
                    "sound": "default"
                },
                "data": push_request.data or {}
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.push_service_url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"📱 Push notification sent to user {push_request.user_id}")
                        return True
                    else:
                        logger.error(f"❌ Push notification failed for user {push_request.user_id}: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"❌ Failed to send push notification to user {push_request.user_id}: {e}")
            return False

    async def save_notification(self, notification_data: Dict):
        """Save notification to database for history"""
        async with AsyncSessionLocal() as session:
            notification = Notification(**notification_data)
            session.add(notification)
            await session.commit()
            return notification.id

    async def update_notification_status(self, notification_id: int, status: str):
        """Update notification status"""
        async with AsyncSessionLocal() as session:
            notification = await session.execute(
                sa.select(Notification).where(Notification.id == notification_id)
            )
            notification = notification.scalar_one_or_none()
            if notification:
                notification.status = status
                notification.sent_at = datetime.utcnow() if status == "SENT" else None
                await session.commit()

# Global notification service instance
notification_service = NotificationService()

# Notification Templates
class NotificationTemplates:
    @staticmethod
    def get_order_created_template(order_data: Dict) -> Dict:
        return {
            "email": {
                "subject": f"🎉 Order Confirmed - #{order_data.get('order_number', '')}",
                "body": f"""
Hi {order_data.get('customer_id', 'Customer')},

Your order has been confirmed!
Order Number: {order_data.get('order_number', '')}
Restaurant: {order_data.get('restaurant_name', '')}
Total Amount: ${order_data.get('total', 0):.2f}

We'll notify you when your order is ready.

Thank you for choosing us!
                """.strip(),
                "html_body": f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #22c55e;">🎉 Order Confirmed!</h2>
    <p>Hi <strong>{order_data.get('customer_id', 'Customer')}</strong>,</p>
    
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> #{order_data.get('order_number', '')}</p>
        <p><strong>Restaurant:</strong> {order_data.get('restaurant_name', '')}</p>
        <p><strong>Total Amount:</strong> ${order_data.get('total', 0):.2f}</p>
    </div>
    
    <p>We'll notify you when your order is ready for delivery.</p>
    <p>Thank you for choosing us! 🍕</p>
</div>
                """
            },
            "sms": f"Order confirmed! #{order_data.get('order_number', '')} from {order_data.get('restaurant_name', '')}. Total: ${order_data.get('total', 0):.2f}. We'll notify you when ready.",
            "push": {
                "title": "🎉 Order Confirmed!",
                "body": f"Your order from {order_data.get('restaurant_name', '')} has been confirmed."
            }
        }

    @staticmethod
    def get_order_status_template(order_data: Dict, new_status: str) -> Dict:
        status_messages = {
            "CONFIRMED": "Your order has been confirmed by the restaurant!",
            "PREPARING": "The restaurant has started preparing your order!",
            "READY": "Your order is ready for pickup!",
            "OUT_FOR_DELIVERY": "Your order is out for delivery!",
            "DELIVERED": "Your order has been delivered! Enjoy your meal! 🍴",
            "CANCELLED": "Your order has been cancelled."
        }
        
        message = status_messages.get(new_status, f"Your order status has been updated to {new_status}.")
        
        return {
            "email": {
                "subject": f"Order Update - #{order_data.get('order_number', '')}",
                "body": f"""
Hi {order_data.get('customer_id', 'Customer')},

{message}

Order Number: {order_data.get('order_number', '')}
Status: {new_status}

Thank you for choosing us!
                """.strip(),
                "html_body": f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h3>Order Status Update</h3>
    <p>Hi <strong>{order_data.get('customer_id', 'Customer')}</strong>,</p>
    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order Number:</strong> #{order_data.get('order_number', '')}</p>
        <p><strong>Status:</strong> {new_status}</p>
        <p>{message}</p>
    </div>
</div>
                """
            },
            "sms": f"Order #{order_data.get('order_number', '')} update: {message}",
            "push": {
                "title": "Order Status Update",
                "body": message
            }
        }

    @staticmethod
    def get_payment_template(payment_data: Dict, status: str) -> Dict:
        if status == "COMPLETED":
            return {
                "email": {
                    "subject": f"Payment Successful - Order #{payment_data.get('order_number', '')}",
                    "body": f"""
Hi Customer,

Your payment of ${payment_data.get('amount', 0):.2f} for order #{payment_data.get('order_number', '')} was successful.

Transaction ID: {payment_data.get('transaction_id', '')}

Thank you for your payment!
                    """.strip()
                },
                "sms": f"Payment of ${payment_data.get('amount', 0):.2f} for order #{payment_data.get('order_number', '')} was successful. TXN: {payment_data.get('transaction_id', '')}",
                "push": {
                    "title": "💳 Payment Successful",
                    "body": f"Payment of ${payment_data.get('amount', 0):.2f} completed for your order."
                }
            }
        else:  # FAILED
            return {
                "email": {
                    "subject": f"Payment Failed - Order #{payment_data.get('order_number', '')}",
                    "body": f"""
Hi Customer,

Your payment of ${payment_data.get('amount', 0):.2f} for order #{payment_data.get('order_number', '')} failed.

Please try again or use a different payment method.

If this continues, contact support.
                    """.strip()
                },
                "sms": f"Payment failed for order #{payment_data.get('order_number', '')}. Please try again.",
                "push": {
                    "title": "❌ Payment Failed",
                    "body": "Your payment failed. Please try again."
                }
            }

    @staticmethod
    def get_delivery_assigned_template(delivery_data: Dict) -> Dict:
        return {
            "email": {
                "subject": f"Delivery Partner Assigned - Order #{delivery_data.get('order_number', '')}",
                "body": f"""
Hi Customer,

A delivery partner has been assigned to your order #{delivery_data.get('order_number', '')}.

Your food will be delivered soon!

Track your order in the app for real-time updates.
                """.strip()
            },
            "sms": f"Delivery partner assigned for order #{delivery_data.get('order_number', '')}. Your food will arrive soon!",
            "push": {
                "title": "🚗 Delivery Update",
                "body": "A delivery partner has been assigned to your order!"
            }
        }

async def handle_event(topic: str, value: bytes):
    """Handles Kafka messages and triggers appropriate notifications."""
    try:
        data = json.loads(value.decode())
        logger.info(f"📩 [NOTIFICATION] topic={topic} | data={data}")

        # Route to appropriate notification handler
        if topic == "order.created":
            await handle_order_created(data)
        elif topic == "order.updated":
            await handle_order_updated(data)
        elif topic == "payment.completed":
            await handle_payment_completed(data)
        elif topic == "payment.failed":
            await handle_payment_failed(data)
        elif topic == "payment.refunded":
            await handle_payment_refunded(data)
        elif topic == "delivery.assigned":
            await handle_delivery_assigned(data)
        elif topic == "delivery.status_updated":
            await handle_delivery_status_updated(data)

    except Exception as e:
        logger.error(f"❌ Failed to process message from {topic}: {e}")

async def handle_order_created(order_data: Dict):
    """Handle new order creation"""
    templates = NotificationTemplates.get_order_created_template(order_data)
    await send_notifications(
        user_id=order_data.get('customer_id'),
        topic="order.created",
        templates=templates,
        metadata=order_data
    )

async def handle_order_updated(order_data: Dict):
    """Handle order status updates"""
    new_status = order_data.get('status')
    if new_status in ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]:
        templates = NotificationTemplates.get_order_status_template(order_data, new_status)
        await send_notifications(
            user_id=order_data.get('customer_id'),
            topic="order.updated",
            templates=templates,
            metadata=order_data
        )

async def handle_payment_completed(payment_data: Dict):
    """Handle payment completion"""
    templates = NotificationTemplates.get_payment_template(payment_data, "COMPLETED")
    await send_notifications(
        user_id=payment_data.get('customer_id'),
        topic="payment.completed",
        templates=templates,
        metadata=payment_data
    )

async def handle_payment_failed(payment_data: Dict):
    """Handle payment failure"""
    templates = NotificationTemplates.get_payment_template(payment_data, "FAILED")
    await send_notifications(
        user_id=payment_data.get('customer_id'),
        topic="payment.failed",
        templates=templates,
        metadata=payment_data
    )

async def handle_payment_refunded(payment_data: Dict):
    """Handle payment refund"""
    # Similar implementation for refunds
    pass

async def handle_delivery_assigned(delivery_data: Dict):
    """Handle delivery assignment"""
    templates = NotificationTemplates.get_delivery_assigned_template(delivery_data)
    await send_notifications(
        user_id=delivery_data.get('customer_id'),
        topic="delivery.assigned",
        templates=templates,
        metadata=delivery_data
    )

async def handle_delivery_status_updated(delivery_data: Dict):
    """Handle delivery status updates"""
    # Implement delivery status specific notifications
    pass

async def send_notifications(user_id: str, topic: str, templates: Dict, metadata: Dict):
    """Send multiple types of notifications for an event"""
    # In real implementation, fetch user contact info from user service
    user_email = f"{user_id}@example.com"  # Mock - fetch from user service
    user_phone = "+1234567890"  # Mock - fetch from user service
    
    tasks = []
    
    # Send Email
    if templates.get('email'):
        email_request = EmailRequest(
            to_email=user_email,
            subject=templates['email']['subject'],
            body=templates['email']['body'],
            html_body=templates['email'].get('html_body')
        )
        tasks.append(send_single_notification("email", user_id, user_email, user_phone, topic, email_request, metadata))
    
    # Send SMS
    if templates.get('sms'):
        sms_request = SMSRequest(
            to_phone=user_phone,
            message=templates['sms']
        )
        tasks.append(send_single_notification("sms", user_id, user_email, user_phone, topic, sms_request, metadata))
    
    # Send Push Notification
    if templates.get('push'):
        push_request = PushNotificationRequest(
            user_id=user_id,
            title=templates['push']['title'],
            body=templates['push']['body'],
            data=metadata
        )
        tasks.append(send_single_notification("push", user_id, user_email, user_phone, topic, push_request, metadata))
    
    # Execute all notification tasks
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

async def send_single_notification(notification_type: str, user_id: str, user_email: str, user_phone: str, topic: str, request, metadata: Dict):
    """Send a single notification and track its status"""
    # Save notification to database
    notification_id = await notification_service.save_notification({
        "user_id": user_id,
        "user_email": user_email,
        "user_phone": user_phone,
        "type": notification_type,
        "topic": topic,
        "subject": getattr(request, 'subject', None),
        "message": getattr(request, 'body', None) or getattr(request, 'message', None),
        "metadata": metadata
    })
    
    # Send notification based on type
    success = False
    if notification_type == "email":
        success = await notification_service.send_email(request)
    elif notification_type == "sms":
        success = await notification_service.send_sms(request)
    elif notification_type == "push":
        success = await notification_service.send_push_notification(request)
    
    # Update notification status
    status = "SENT" if success else "FAILED"
    await notification_service.update_notification_status(notification_id, status)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown management for FastAPI."""
    print("🚀 Notification Service is starting...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start Kafka consumers
    for topic in TOPICS:
        logger.info(f"🧠 Starting consumer for topic: {topic}")
        task = asyncio.create_task(start_consumer(topic, "notify-group", handle_event))
        consumer_tasks.append(task)

    # Wait a moment to confirm all consumers start
    await asyncio.sleep(1)
    logger.info("✅ All Kafka consumers running!")

    # Yield control to FastAPI (service is now live)
    yield

    # Shutdown phase — gracefully cancel all consumers
    logger.info("🛑 Shutting down Notification Service...")
    for task in consumer_tasks:
        task.cancel()
    await asyncio.gather(*consumer_tasks, return_exceptions=True)
    logger.info("👋 All consumers stopped. Bye!")

# Initialize app with lifespan
app = FastAPI(title="Notification Service", lifespan=lifespan)

# API Endpoints for manual notifications
@app.post("/notifications/email")
async def send_email_notification(email_request: EmailRequest, background_tasks: BackgroundTasks):
    """Send an email notification manually"""
    background_tasks.add_task(notification_service.send_email, email_request)
    return {"status": "EMAIL_QUEUED"}

@app.post("/notifications/sms")
async def send_sms_notification(sms_request: SMSRequest, background_tasks: BackgroundTasks):
    """Send an SMS notification manually"""
    background_tasks.add_task(notification_service.send_sms, sms_request)
    return {"status": "SMS_QUEUED"}

@app.post("/notifications/push")
async def send_push_notification(push_request: PushNotificationRequest, background_tasks: BackgroundTasks):
    """Send a push notification manually"""
    background_tasks.add_task(notification_service.send_push_notification, push_request)
    return {"status": "PUSH_QUEUED"}

@app.get("/notifications/history")
async def get_notification_history(user_id: str, limit: int = 50):
    """Get notification history for a user"""
    async with AsyncSessionLocal() as session:
        notifications = await session.execute(
            sa.select(Notification).where(
                Notification.user_id == user_id
            ).order_by(Notification.created_at.desc()).limit(limit)
        )
        notifications = notifications.scalars().all()
        return notifications

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "notification",
        "timestamp": datetime.utcnow().isoformat()
    }