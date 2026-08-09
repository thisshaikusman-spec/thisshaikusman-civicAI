from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.user_db import UserDB  # noqa: F401
from app.services.auth_service import hash_password
from app.routes.auth import router as auth_router
from app.routes.complaints import router as complaints_router
from app.utils.error_handlers import register_exception_handlers

app = FastAPI(title=settings.app_name)

Base.metadata.create_all(bind=engine)
register_exception_handlers(app)

def seed_demo_users():
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

seed_demo_users()

dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
origins = []
if settings.frontend_url:
    origins.append(settings.frontend_url)
for o in dev_origins:
    if o not in origins:
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
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
    response.headers.setdefault("Content-Security-Policy", "default-src 'self';")
    return response

app.include_router(complaints_router, prefix="/complaints", tags=["complaints"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/")
async def read_root():
    return {"message": "AI Complaint Routing System Backend is running"}
