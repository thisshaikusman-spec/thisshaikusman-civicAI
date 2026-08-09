from typing import Literal, Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, confloat, constr


AllowedComplaintStatuses = Literal[
    "Submitted",
    "In Progress",
    "Resolved",
    "Rejected",
]


class ComplaintCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    email: EmailStr
    phone: constr(strip_whitespace=True, min_length=1)
    title: constr(strip_whitespace=True, min_length=1)
    description: constr(strip_whitespace=True, min_length=1)
    location: constr(strip_whitespace=True, min_length=1)
    latitude: confloat(ge=-90, le=90)
    longitude: confloat(ge=-180, le=180)
    category: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: AllowedComplaintStatuses


class Complaint(BaseModel):
    id: Optional[int] = None
    title: str
    description: str
    email: EmailStr
    category: Optional[str] = None
    department: Optional[str] = None


class ComplaintResponse(BaseModel):
    complaint_id: str
    title: str
    description: str
    email: EmailStr           # citizen's email — used for per-citizen filtering
    category: str
    department: str
    priority: str
    confidence: float
    status: str
    location: str
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: Optional[datetime] = None


class ComplaintListResponse(BaseModel):
    total: int
    complaints: list[ComplaintResponse]


class AnalyzeRequest(BaseModel):
    title: str
    description: str


class AnalyzeResponse(BaseModel):
    category: str
    department: str
    priority: str
    confidence: float
    urgency_score: int
    risk_level: str
    risk_factors: list[str]
    ai_assessment: str

