"""
FastAPI Main Application Entry Point
Live Indoor Location Tracking System - NSG CQB Prototype
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.devices import router as devices_router
from app.api.locations import router as locations_router
from app.services.websocket import ws_manager

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for database initialization and cleanup."""
    logger.info("Initializing NSG CQB Location Tracking Backend...")
    await init_db()
    logger.info("Backend services ready to receive telemetry.")
    yield
    logger.info("Shutting down backend services.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend REST API and WebSocket streaming service for real-time 3D indoor tracking of CQB teams.",
    version="0.1.0",
    lifespan=lifespan
)

# Setup CORS for Frontend dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routers under /api
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(locations_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """Root status endpoint verifying system operational health."""
    return {
        "system": settings.PROJECT_NAME,
        "status": "online",
        "docs_url": "/docs",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    """Health check endpoint as defined in API_CONTRACT.md."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.websocket("/ws/locations")
async def websocket_locations_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming live location telemetry to monitoring clients.
    Conforms to docs/API_CONTRACT.md.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket alive, receive client ping/pong or control messages
            data = await websocket.receive_text()
            # If client sends ping, echo pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)
