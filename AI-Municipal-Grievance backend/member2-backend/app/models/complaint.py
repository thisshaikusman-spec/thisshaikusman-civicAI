from typing import Literal, Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


AllowedComplaintStatuses = Literal[
    "Submitted",
    "In Progress",
    "Resolved",
    "Rejected",
    "Location Unverified",
]


class PhotoMetadata(BaseModel):
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    captured_at: Optional[str] = None
    is_verified: Optional[bool] = False
    source: Optional[str] = "gallery"


class ComplaintCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    category: Optional[str] = None
    image_url: Optional[str] = None
    photos: Optional[list[str]] = []
    photos_metadata: Optional[list[PhotoMetadata]] = []


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
    image_url: Optional[str] = None
    photos: Optional[list[str]] = []
    photos_metadata: Optional[list[PhotoMetadata]] = []
    is_duplicate: Optional[bool] = False
    duplicate_of_id: Optional[str] = None
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


class TrackLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None
    tracked_by: Optional[str] = None
    source: Optional[str] = None
    timestamp: Optional[datetime] = None


class LocationLogItem(BaseModel):
    id: int
    complaint_id: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    tracked_by: str
    source: Optional[str] = "field_officer"
    timestamp: datetime


class TrackingHistoryResponse(BaseModel):
    complaint_id: str
    status: str
    is_tracking_active: bool
    count: int
    history: list[LocationLogItem]



