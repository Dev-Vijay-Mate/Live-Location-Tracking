"""
Locations Telemetry API Endpoints and WebSocket Streaming
Adheres strictly to docs/API_CONTRACT.md
"""
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.location import Device, LocationRecord
from app.schemas.location import (
    LocationCreate,
    LocationCreateAck,
    LocationResponse,
    LocationLatestListResponse,
    LocationHistoryResponse,
    LocationHistoryItem,
    PositionSchema
)
from app.services.websocket import ws_manager

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.post("", response_model=LocationCreateAck, status_code=200)
async def submit_location(payload: LocationCreate, db: AsyncSession = Depends(get_db)):
    """
    Ingest a new simulated or live device location coordinate.
    Validates payload, records history, updates device state, and broadcasts over WebSocket.
    """
    ts = payload.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    # 1. Upsert Device entity with latest location and timestamp
    stmt = select(Device).where(Device.device_id == payload.device_id)
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()

    if device is None:
        # Auto-provision device if first telemetry received
        device = Device(
            device_id=payload.device_id,
            name=f"Unit {payload.device_id}",
            floor_id=payload.floor_id.value,
            current_x=payload.position.x,
            current_z=payload.position.z,
            status="online",
            last_seen=ts
        )
        db.add(device)
    else:
        device.floor_id = payload.floor_id.value
        device.current_x = payload.position.x
        device.current_z = payload.position.z
        device.status = "online"
        device.last_seen = ts

    # 2. Append to historical audit log
    record = LocationRecord(
        device_id=payload.device_id,
        building_id=payload.building_id,
        floor_id=payload.floor_id.value,
        x=payload.position.x,
        z=payload.position.z,
        source=payload.source,
        timestamp=ts
    )
    db.add(record)
    await db.commit()

    # 3. Broadcast real-time location update to connected WebSockets
    broadcast_data = {
        "device_id": payload.device_id,
        "building_id": payload.building_id,
        "floor_id": payload.floor_id.value,
        "position": {
            "x": payload.position.x,
            "z": payload.position.z
        },
        "source": payload.source,
        "timestamp": ts.isoformat()
    }
    await ws_manager.broadcast_location(broadcast_data)

    return LocationCreateAck(
        status="accepted",
        device_id=payload.device_id,
        timestamp=ts
    )


@router.get("/latest", response_model=LocationLatestListResponse)
async def get_latest_locations(db: AsyncSession = Depends(get_db)):
    """
    Retrieve the most recent known position for all active devices.
    """
    stmt = select(Device).order_by(Device.device_id.asc())
    result = await db.execute(stmt)
    devices = result.scalars().all()

    locations: List[LocationResponse] = [
        LocationResponse(
            device_id=d.device_id,
            building_id="DEMO_BUILDING_001",
            floor_id=d.floor_id,
            position=PositionSchema(x=d.current_x, z=d.current_z),
            timestamp=d.last_seen
        )
        for d in devices
    ]

    return LocationLatestListResponse(locations=locations)


@router.get("/history/{device_id}", response_model=LocationHistoryResponse)
async def get_location_history(
    device_id: str,
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve historical trajectory coordinates for a specific device.
    """
    stmt = (
        select(LocationRecord)
        .where(LocationRecord.device_id == device_id)
        .order_by(desc(LocationRecord.timestamp))
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    history: List[LocationHistoryItem] = [
        LocationHistoryItem(
            floor_id=r.floor_id,
            position=PositionSchema(x=r.x, z=r.z),
            timestamp=r.timestamp
        )
        for r in records
    ]

    return LocationHistoryResponse(device_id=device_id, history=history)
