"""
SQLAlchemy ORM Models for Devices and Location Records
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    team = Column(String(64), default="House Intervention Team (HIT)")
    status = Column(String(32), default="online", index=True)
    floor_id = Column(String(32), default="GROUND", index=True)
    current_x = Column(Float, default=0.0)
    current_z = Column(Float, default=0.0)
    last_seen = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    location_history = relationship(
        "LocationRecord",
        back_populates="device",
        cascade="all, delete-orphan",
        order_by="desc(LocationRecord.timestamp)"
    )

    def __repr__(self):
        return f"<Device(id='{self.device_id}', name='{self.name}', floor='{self.floor_id}', status='{self.status}')>"


class LocationRecord(Base):
    __tablename__ = "location_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), ForeignKey("devices.device_id", ondelete="CASCADE"), nullable=False, index=True)
    building_id = Column(String(64), default="DEMO_BUILDING_001", nullable=False)
    floor_id = Column(String(32), nullable=False, index=True)
    x = Column(Float, nullable=False)
    z = Column(Float, nullable=False)
    source = Column(String(32), default="SIMULATION", nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    device = relationship("Device", back_populates="location_history")

    __table_args__ = (
        Index("idx_device_timestamp", "device_id", "timestamp"),
    )

    def __repr__(self):
        return f"<LocationRecord(device='{self.device_id}', floor='{self.floor_id}', x={self.x}, z={self.z}, t='{self.timestamp}')>"
