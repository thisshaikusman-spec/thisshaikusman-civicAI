import sys
import os

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.user_db import UserDB  # noqa: F401
from app.models.complaint_location_log_db import ComplaintLocationLogDB  # noqa: F401
from app.services.auth_service import hash_password
from app.routes.auth import router as auth_router
from app.routes.complaints import router as complaints_router
from app.utils.error_handlers import register_exception_handlers

import os
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

app = FastAPI(title=settings.app_name)

if os.environ.get("VERCEL"):
    uploads_dir = "/tmp/uploads"
else:
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

try:
    os.makedirs(uploads_dir, exist_ok=True)
    if os.path.exists(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
except Exception as err:
    print(f"Warning: Could not setup uploads directory: {err}")

try:
    Base.metadata.create_all(bind=engine)
except Exception as err:
    print(f"Warning: Base.metadata.create_all failed: {err}")

try:
    with engine.connect() as conn:
        for col_sql in [
            "ALTER TABLE complaints ADD COLUMN is_duplicate BOOLEAN DEFAULT 0",
            "ALTER TABLE complaints ADD COLUMN duplicate_of_id VARCHAR",
            "ALTER TABLE complaints ADD COLUMN photos VARCHAR",
            "ALTER TABLE complaints ADD COLUMN photos_metadata VARCHAR",
        ]:
            try:
                conn.execute(text(col_sql))
            except Exception:
                pass
        conn.commit()
except Exception as err:
    print(f"Warning: DB migration failed: {err}")

register_exception_handlers(app)

def seed_demo_users():
    try:
        db = SessionLocal()
        try:
            if not db.query(UserDB).filter(UserDB.email == "citizen@demo.com").first():
                db.add(UserDB(
                    name="Demo Citizen",
                    email="citizen@demo.com",
                    password_hash=hash_password("demo123"),
                    role="citizen",
                ))
            if not db.query(UserDB).filter(UserDB.email == "officer@demo.com").first():
                db.add(UserDB(
                    name="Demo Officer",
                    email="officer@demo.com",
                    password_hash=hash_password("demo123"),
                    role="officer",
                ))
            db.commit()
        except Exception as e:
            print("Demo user seeding warning:", e)
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        print("Demo user DB session error:", e)

seed_demo_users()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if settings.frontend_url and settings.frontend_url not in origins:
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if getattr(settings, "app_env", "development") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com;"
        )
    return response

app.include_router(complaints_router, prefix="/complaints", tags=["complaints"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/")
async def read_root():
    return {"message": "AI Complaint Routing System Backend is running"}
