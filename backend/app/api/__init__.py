"""
API Routers Package
"""
from app.api.devices import router as devices_router
from app.api.locations import router as locations_router

__all__ = ["devices_router", "locations_router"]
