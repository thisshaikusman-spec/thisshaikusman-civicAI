from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.complaint import (
    AnalyzeRequest,
    AnalyzeResponse,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintResponse,
    ComplaintStatusUpdate,
)
from app.models.complaint_db import ComplaintDB
from app.services.ai_service import (
    analyze_and_rank_complaints_with_llm,
    analyze_single_complaint_preview,
    classify_complaint,
)

router = APIRouter()


@router.post("/analyze-preview", response_model=AnalyzeResponse)
async def analyze_complaint_preview(payload: AnalyzeRequest):
    return analyze_single_complaint_preview(payload.title, payload.description)



def complaint_to_response(complaint: ComplaintDB) -> ComplaintResponse:
    return ComplaintResponse(
        complaint_id=complaint.complaint_id,
        title=complaint.title,
        description=complaint.description,
        email=complaint.email,
        category=complaint.category,
        department=complaint.department,
        priority=complaint.priority,
        confidence=complaint.confidence,
        status=complaint.status,
        location=complaint.location,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
    )



def _generate_complaint_id(db: Session) -> str:
    current_max = db.query(func.max(ComplaintDB.id)).scalar() or 0
    return f"CMP-{current_max + 1:04d}"


@router.get("/", response_model=ComplaintListResponse)
async def list_complaints(
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    # Optional per-citizen filter. Officers omit this and receive ALL complaints.
    # TODO: ownership enforcement (verify JWT email == ?email= param) is a follow-up, not done here.
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(ComplaintDB)

    if status is not None:
        query = query.filter(func.lower(ComplaintDB.status) == status.lower())
    if department is not None:
        query = query.filter(func.lower(ComplaintDB.department) == department.lower())
    if category is not None:
        query = query.filter(func.lower(ComplaintDB.category) == category.lower())
    if priority is not None:
        query = query.filter(func.lower(ComplaintDB.priority) == priority.lower())
    if email is not None:
        # Case-insensitive match; AND'd with all other active filters above
        query = query.filter(func.lower(ComplaintDB.email) == email.lower())

    complaints = query.all()

    return {
        "total": len(complaints),
        "complaints": [complaint_to_response(complaint) for complaint in complaints],
    }


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    complaints = db.query(ComplaintDB).all()
    total = len(complaints)

    by_status: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_department: dict[str, int] = {}
    by_priority: dict[str, int] = {}

    resolved_count = 0
    resolution_hours_sum = 0.0
    resolution_count = 0

    for c in complaints:
        by_status[c.status] = by_status.get(c.status, 0) + 1
        by_category[c.category] = by_category.get(c.category, 0) + 1
        by_department[c.department] = by_department.get(c.department, 0) + 1
        by_priority[c.priority] = by_priority.get(c.priority, 0) + 1

        if c.status == "Resolved":
            resolved_count += 1
            if c.updated_at and c.created_at:
                delta_hours = (c.updated_at - c.created_at).total_seconds() / 3600
                resolution_hours_sum += delta_hours
                resolution_count += 1

    resolution_rate = round((resolved_count / total) * 100, 2) if total else 0.0
    avg_resolution_hours = round(resolution_hours_sum / resolution_count, 2) if resolution_count else None

    return {
        "total": total,
        "by_status": by_status,
        "by_category": by_category,
        "by_department": by_department,
        "by_priority": by_priority,
        "resolution_rate_percent": resolution_rate,
        "avg_resolution_hours": avg_resolution_hours,
    }


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = db.query(ComplaintDB).filter(ComplaintDB.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    return complaint_to_response(complaint)


@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    status_update: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
):
    complaint = db.query(ComplaintDB).filter(ComplaintDB.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )

    complaint.status = status_update.status
    complaint.updated_at = datetime.utcnow()
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    return {
        "complaint_id": complaint.complaint_id,
        "status": complaint.status,
        "updated_at": complaint.updated_at,
        "message": "Complaint status updated successfully",
    }


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    try:
        ai_result = classify_complaint(complaint.title, complaint.description)
        complaint_id = _generate_complaint_id(db)

        db_complaint = ComplaintDB(
            complaint_id=complaint_id,
            name=complaint.name,
            email=str(complaint.email),
            phone=complaint.phone,
            title=complaint.title,
            description=complaint.description,
            location=complaint.location,
            latitude=complaint.latitude,
            longitude=complaint.longitude,
            category=ai_result["category"],
            department=ai_result["department"],
            priority=ai_result["priority"],
            confidence=ai_result["confidence"],
            status="Submitted",
        )
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)

        return complaint_to_response(db_complaint)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while creating complaint.",
        ) from exc


@router.post("/ai-analyze-priorities")
async def ai_analyze_priorities(
    apply_to_db: bool = Query(False, description="If true, updates the DB complaint priority fields with AI recommended priorities"),
    db: Session = Depends(get_db),
):
    complaints = db.query(ComplaintDB).all()
    if not complaints:
        return {
            "summary": {
                "total_analyzed": 0,
                "critical_count": 0,
                "high_count": 0,
                "primary_recommendation": "No complaints found in the database.",
            },
            "ranked_complaints": [],
        }

    analysis_result = analyze_and_rank_complaints_with_llm(complaints)

    if apply_to_db:
        priority_map = {item["complaint_id"]: item["ai_priority"] for item in analysis_result["ranked_complaints"]}
        for c in complaints:
            if c.complaint_id in priority_map:
                c.priority = priority_map[c.complaint_id]
                c.updated_at = datetime.utcnow()
        db.commit()

    return analysis_result

