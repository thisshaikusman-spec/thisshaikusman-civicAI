from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen")  # "citizen" | "officer"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
