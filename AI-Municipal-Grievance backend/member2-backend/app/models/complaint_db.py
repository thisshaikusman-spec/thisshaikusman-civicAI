from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class ComplaintDB(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    photos = Column(String, nullable=True)
    photos_metadata = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    department = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="Submitted")
    is_duplicate = Column(Boolean, default=False, nullable=True)
    duplicate_of_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    location_logs = relationship("ComplaintLocationLogDB", back_populates="complaint", cascade="all, delete-orphan")


