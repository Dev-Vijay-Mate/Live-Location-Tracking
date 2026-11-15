"""
Devices API Endpoints
Handles device roster queries and live status evaluations.
"""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.location import Device
from app.schemas.location import (
    DeviceResponse,
    DeviceListResponse,
    PositionSchema,
    DeviceStatusEnum
)

router = APIRouter(prefix="/devices", tags=["Devices"])


def compute_device_status(last_seen: datetime) -> DeviceStatusEnum:
    """Computes online, stale, or offline status based on elapsed time."""
    if not last_seen:
        return DeviceStatusEnum.OFFLINE

    now = datetime.now(timezone.utc)
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    elapsed_seconds = (now - last_seen).total_seconds()

    if elapsed_seconds <= settings.STALE_THRESHOLD_SECONDS:
        return DeviceStatusEnum.ONLINE
    elif elapsed_seconds <= settings.OFFLINE_THRESHOLD_SECONDS:
        return DeviceStatusEnum.STALE
    else:
        return DeviceStatusEnum.OFFLINE


@router.get("", response_model=DeviceListResponse)
async def list_devices(db: AsyncSession = Depends(get_db)):
    """
    List all registered devices with their current operational status,
    floor level, and physical coordinates.
    """
    stmt = select(Device).order_by(Device.device_id.asc())
    result = await db.execute(stmt)
    devices = result.scalars().all()

    device_responses: List[DeviceResponse] = []
    for d in devices:
        status = compute_device_status(d.last_seen)
        device_responses.append(
            DeviceResponse(
                device_id=d.device_id,
                name=d.name or d.device_id,
                status=status,
                floor_id=d.floor_id,
                position=PositionSchema(x=d.current_x, z=d.current_z),
                last_seen=d.last_seen
            )
        )

    return DeviceListResponse(devices=device_responses)
