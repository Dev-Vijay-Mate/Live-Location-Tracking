"""
Pydantic Schemas for Location Telemetry and Device Management
Adheres strictly to docs/API_CONTRACT.md
"""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class FloorIDEnum(str, Enum):
    BASEMENT = "BASEMENT"
    GROUND = "GROUND"
    FIRST = "FIRST"
    SECOND = "SECOND"


class DeviceStatusEnum(str, Enum):
    ONLINE = "online"
    STALE = "stale"
    OFFLINE = "offline"


class PositionSchema(BaseModel):
    x: float = Field(..., description="Horizontal X-axis coordinate in meters")
    z: float = Field(..., description="Horizontal Z-axis depth coordinate in meters")


class LocationCreate(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device / personnel ID")
    building_id: str = Field(default="DEMO_BUILDING_001", min_length=1, max_length=64)
    floor_id: FloorIDEnum = Field(..., description="Floor level: BASEMENT, GROUND, FIRST, SECOND")
    position: PositionSchema = Field(..., description="2D horizontal position coordinates")
    source: str = Field(default="SIMULATION", description="Data source (SIMULATION or DEVICE)")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the telemetry reading"
    )

    @field_validator("timestamp")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)


class LocationResponse(BaseModel):
    device_id: str
    building_id: str
    floor_id: str
    position: PositionSchema
    timestamp: datetime


class LocationCreateAck(BaseModel):
    status: str = "accepted"
    device_id: str
    timestamp: datetime


class DeviceBase(BaseModel):
    device_id: str
    name: str
    status: DeviceStatusEnum = DeviceStatusEnum.ONLINE
    floor_id: str = "GROUND"
    position: Optional[PositionSchema] = None
    last_seen: datetime


class DeviceResponse(DeviceBase):
    pass


class DeviceListResponse(BaseModel):
    devices: List[DeviceResponse]


class LocationLatestListResponse(BaseModel):
    locations: List[LocationResponse]


class LocationHistoryItem(BaseModel):
    floor_id: str
    position: PositionSchema
    timestamp: datetime


class LocationHistoryResponse(BaseModel):
    device_id: str
    history: List[LocationHistoryItem]
