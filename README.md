# 360 Byte Readers · Tech for Good 2026

Team repository for **Build with AI: Code for Communities** — GDG Coimbatore
(Hackathon **Aug 8–9, 2026**, GRD College — Room 204).

## 🚀 Project Overview: AI Municipal Grievance System

An end-to-end AI-powered municipal grievance & complaint routing platform featuring:
- **Next.js 16 (React 19, Turbopack)** modern responsive frontend for Citizens and Officers.
- **FastAPI Python Backend** with NLP hazard & risk scoring models, automated department routing, and geographic mapping.
- **AI Risk Analyzer** for immediate infection/health/structural emergency classification.

---

## 🛠️ Deployment Instructions

### 1. Frontend Deployment (Vercel)

The Next.js frontend is located inside the `municipal frontend/` directory.

#### Steps to deploy to Vercel:
```bash
# 1. Navigate to the frontend directory
cd "municipal frontend"

# 2. Run Vercel CLI (or install via npm i -g vercel)
npx vercel --prod

# 3. Environment Variables setup on Vercel Dashboard or CLI:
# Add NEXT_PUBLIC_FASTAPI_URL pointing to the FastAPI backend API host URL:
npx vercel env add NEXT_PUBLIC_FASTAPI_URL production
```

---

## ☁️ Backend Deployment Strategy & Architecture Plan

*(For Hackathon Demo & Judging)*

### Architecture & Production Strategy
1. **Containerization**:
   - Docker container built using `python:3.14-slim` base image running `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
2. **Hosting Infrastructure**:
   - **GCP Cloud Run / Render / AWS App Runner**: Stateless serverless container host allowing autoscaling with zero baseline cost.
3. **Database Migration**:
   - Production database target: **Managed PostgreSQL** (Supabase / GCP Cloud SQL).
   - Migration path: SQLAlchemy handles seamlessly switching from local SQLite (`complaints.db`) to PostgreSQL connection string (`postgresql+psycopg2://...`).
4. **Local Demo Setup**:
   - Frontend is deployed live on Vercel.
   - FastAPI Backend with AI model evaluation runs locally on `http://127.0.0.1:8000` with local SQLite database for instant high-speed demo queries.

---

## 📂 Repo Structure

| Path | Description |
|------|-------------|
| `municipal frontend/` | Next.js 16 Web Application (Citizen & Officer dashboards) |
| `AI-Municipal-Grievance backend/member2-backend/` | FastAPI Python backend, AI routing, & SQLite database |
| `PROPOSAL.md` | Hackathon architecture proposal |
| `docs/` | Architecture notes and diagrams |

— GDG Coimbatore · TiE Kovai Con · GRD College · Room 204

