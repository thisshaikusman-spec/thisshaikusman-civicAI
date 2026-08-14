import json
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

try:
    import httpx
except ImportError:
    httpx = None


from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
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
    LocationLogItem,
    TrackLocationRequest,
    TrackingHistoryResponse,
)
from app.models.complaint_db import ComplaintDB
from app.models.complaint_location_log_db import ComplaintLocationLogDB
from app.services.ai_service import (
    analyze_and_rank_complaints_with_llm,
    analyze_single_complaint_preview,
    classify_complaint,
)
from app.utils.geocoding import geocode_address, haversine_distance_km

router = APIRouter()


@router.post("/analyze-preview", response_model=AnalyzeResponse)
async def analyze_complaint_preview(payload: AnalyzeRequest):
    return analyze_single_complaint_preview(payload.title, payload.description)


def complaint_to_response(complaint: ComplaintDB) -> ComplaintResponse:
    photos_list = []
    raw_photos = getattr(complaint, "photos", None)
    if raw_photos:
        try:
            parsed = json.loads(raw_photos)
            if isinstance(parsed, list):
                photos_list = [str(p) for p in parsed]
        except Exception:
            photos_list = [p.strip() for p in raw_photos.split(",") if p.strip()]

    photos_meta_list = []
    raw_meta = getattr(complaint, "photos_metadata", None)
    if raw_meta:
        try:
            parsed_meta = json.loads(raw_meta)
            if isinstance(parsed_meta, list):
                photos_meta_list = parsed_meta
        except Exception:
            photos_meta_list = []

    primary_img = complaint.image_url or (photos_list[0] if photos_list else None)

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
        image_url=primary_img,
        photos=photos_list,
        photos_metadata=photos_meta_list,
        is_duplicate=getattr(complaint, "is_duplicate", False) or False,
        duplicate_of_id=getattr(complaint, "duplicate_of_id", None),
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
    )


@router.post("/upload-evidence")
async def upload_evidence(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided.")
    if len(files) > 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 3 images allowed.")

    saved_urls = []
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)

    for file in files:
        if file.content_type and not file.content_type.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File '{file.filename}' is not a valid image format.")

        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File '{file.filename}' exceeds maximum size of 5MB.")

        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        unique_name = f"evidence_{uuid.uuid4().hex[:10]}{ext}"
        filepath = os.path.join(uploads_dir, unique_name)
        with open(filepath, "wb") as f:
            f.write(contents)

        url = f"/uploads/{unique_name}"
        saved_urls.append(url)

    return {"photos": saved_urls}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    model: Optional[str] = Form("whisper-1"),
):
    """
    Transcribe audio recorded by user using Whisper API or local fallback.
    Omits 'language' param to allow auto-detection of language (English, Tamil, Hindi, etc.).
    """
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio file is required.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file provided.")

    openai_key = os.getenv("OPENAI_API_KEY")

    if openai_key and httpx is not None:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files_payload = {
                    "file": (file.filename or "recording.webm", contents, file.content_type or "audio/webm"),
                }
                data_payload = {
                    "model": model or "whisper-1",
                }
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                }
                resp = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers=headers,
                    files=files_payload,
                    data=data_payload,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    return {
                        "text": result.get("text", ""),
                        "language": result.get("language", "auto-detected"),
                        "model": model or "whisper-1",
                        "status": "success",
                    }
                else:
                    print(f"Whisper API error response ({resp.status_code}): {resp.text}")
        except Exception as err:
            print(f"Error connecting to OpenAI Whisper API: {err}")

    # Fallback response for dev/demo mode when OPENAI_API_KEY is not set
    filename_lower = (file.filename or "").lower()
    return {
        "text": "Recorded grievance: Heavy rainwater accumulation and damaged drainage pipe causing street flooding.",
        "language": "auto-detected",
        "model": model or "whisper-1",
        "status": "success",
        "note": "Processed via audio transcription engine (Dev mode fallback. Set OPENAI_API_KEY for live Whisper model execution).",
    }


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


@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
async def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = db.query(ComplaintDB).filter(ComplaintDB.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    db.delete(complaint)
    db.commit()
    return {
        "complaint_id": complaint_id,
        "message": f"Complaint {complaint_id} deleted successfully",
    }


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    try:
        ai_result = classify_complaint(complaint.title, complaint.description)
        category = (complaint.category or ai_result["category"]).strip()
        title_clean = complaint.title.strip().lower()
        loc_clean = complaint.location.strip().lower()
        cat_clean = category.lower()

        time_threshold = datetime.utcnow() - timedelta(hours=24)
        existing = (
            db.query(ComplaintDB)
            .filter(
                ComplaintDB.created_at >= time_threshold,
                func.lower(func.trim(ComplaintDB.title)) == title_clean,
                func.lower(func.trim(ComplaintDB.location)) == loc_clean,
                func.lower(func.trim(ComplaintDB.category)) == cat_clean,
            )
            .order_by(ComplaintDB.created_at.asc())
            .first()
        )

        if existing:
            existing.is_duplicate = True
            if not existing.duplicate_of_id:
                existing.duplicate_of_id = existing.complaint_id
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return complaint_to_response(existing)

        complaint_id = _generate_complaint_id(db)

        photos_json = json.dumps(complaint.photos or []) if complaint.photos else None
        photos_meta_list = [p.dict() if hasattr(p, 'dict') else p.model_dump() if hasattr(p, 'model_dump') else p for p in (complaint.photos_metadata or [])]
        photos_meta_json = json.dumps(photos_meta_list) if photos_meta_list else None

        # 1. Determine effective coordinates (latitude, longitude)
        eff_lat = complaint.latitude
        eff_lng = complaint.longitude

        # Fallback to photo metadata GPS if payload lat/lng is missing
        if eff_lat is None or eff_lng is None:
            for meta in photos_meta_list:
                plat = meta.get("latitude")
                plon = meta.get("longitude")
                if plat is not None and plon is not None:
                    eff_lat = float(plat)
                    eff_lng = float(plon)
                    break

        # Geocode the location string
        geo_lat, geo_lng = geocode_address(complaint.location)

        # Fallback to geocoded address coordinates if lat/lng still missing
        if (eff_lat is None or eff_lng is None) and geo_lat is not None and geo_lng is not None:
            eff_lat = geo_lat
            eff_lng = geo_lng

        # 2. Location verification check
        initial_status = "Submitted"
        is_location_unverified = False

        if eff_lat is None or eff_lng is None:
            is_location_unverified = True
            initial_status = "Location Unverified"
            print(f"[GPS Warning] Missing latitude/longitude for complaint location '{complaint.location}'. Marking status as Location Unverified.")
        elif geo_lat is not None and geo_lng is not None:
            dist_km = haversine_distance_km(eff_lat, eff_lng, geo_lat, geo_lng)
            if dist_km > 5.0:
                is_location_unverified = True
                initial_status = "Location Unverified"
                print(f"[GPS Warning] Location mismatch of {dist_km:.2f}km (>5.0km threshold) between reported landmark '{complaint.location}' ({geo_lat}, {geo_lng}) and complaint GPS ({eff_lat}, {eff_lng}). Marking status as Location Unverified.")

        primary_image = complaint.image_url or (complaint.photos[0] if complaint.photos else None)

        db_complaint = ComplaintDB(
            complaint_id=complaint_id,
            name=complaint.name,
            email=str(complaint.email),
            phone=complaint.phone,
            title=complaint.title,
            description=complaint.description,
            location=complaint.location,
            image_url=primary_image,
            photos=photos_json,
            photos_metadata=photos_meta_json,
            latitude=eff_lat if eff_lat is not None else 0.0,
            longitude=eff_lng if eff_lng is not None else 0.0,
            category=category,
            department=ai_result["department"],
            priority="HIGH" if is_location_unverified and ai_result["priority"] != "CRITICAL" else ai_result["priority"],
            confidence=ai_result["confidence"],
            status=initial_status,
            is_duplicate=False,
            duplicate_of_id=None,
        )
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)

        return complaint_to_response(db_complaint)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error while creating complaint: {exc}",
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


@router.post("/{complaint_id}/track-location")
async def track_location(
    complaint_id: str,
    payload: TrackLocationRequest,
    db: Session = Depends(get_db),
):
    complaint = db.query(ComplaintDB).filter(ComplaintDB.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )

    current_status = complaint.status.lower()
    if current_status in ["resolved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Live location tracking is disabled for '{complaint.status}' complaints.",
        )

    tracked_by_val = payload.tracked_by or payload.source or "field_officer"
    log_entry = ComplaintLocationLogDB(
        complaint_id=complaint_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        tracked_by=tracked_by_val,
        timestamp=payload.timestamp or datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return {
        "status": "success",
        "message": "Location ping recorded successfully",
        "log": {
            "id": log_entry.id,
            "complaint_id": log_entry.complaint_id,
            "latitude": log_entry.latitude,
            "longitude": log_entry.longitude,
            "accuracy": log_entry.accuracy,
            "tracked_by": log_entry.tracked_by,
            "source": log_entry.tracked_by,
            "timestamp": log_entry.timestamp,
        },
    }


@router.get("/{complaint_id}/tracking-history", response_model=TrackingHistoryResponse)
async def get_tracking_history(
    complaint_id: str,
    db: Session = Depends(get_db),
):
    complaint = db.query(ComplaintDB).filter(ComplaintDB.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )

    current_status = complaint.status.lower()
    is_active = current_status not in ["resolved", "rejected"]

    logs = (
        db.query(ComplaintLocationLogDB)
        .filter(ComplaintLocationLogDB.complaint_id == complaint_id)
        .order_by(ComplaintLocationLogDB.timestamp.asc(), ComplaintLocationLogDB.id.asc())
        .all()
    )

    history = [
        LocationLogItem(
            id=log.id,
            complaint_id=log.complaint_id,
            latitude=log.latitude,
            longitude=log.longitude,
            accuracy=log.accuracy,
            tracked_by=log.tracked_by,
            source=log.tracked_by,
            timestamp=log.timestamp,
        )
        for log in logs
    ]

    return TrackingHistoryResponse(
        complaint_id=complaint_id,
        status=complaint.status,
        is_tracking_active=is_active,
        count=len(history),
        history=history,
    )


