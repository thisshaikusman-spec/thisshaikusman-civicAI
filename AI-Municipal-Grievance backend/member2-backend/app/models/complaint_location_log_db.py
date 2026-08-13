from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class ComplaintLocationLogDB(Base):
    __tablename__ = "complaint_location_log"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, ForeignKey("complaints.complaint_id", ondelete="CASCADE"), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    tracked_by = Column(String, nullable=False, default="field_officer")
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("ComplaintDB", back_populates="location_logs")
