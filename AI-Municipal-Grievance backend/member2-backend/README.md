# AI Municipal Grievance System (Backend)

Lightweight FastAPI backend for classifying and routing municipal complaints.

Technology stack
- Python 3.14+
- FastAPI
- Pydantic / pydantic-settings
- SQLAlchemy
- SQLite
- Uvicorn

Project layout

See the `app/` package for the application code.

Quick start

1. Create a virtual environment (recommended):

```bash
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and adjust values if needed.

4. Start the server:

```bash
python -m uvicorn app.main:app --reload
```

API endpoints

- `GET /` — health endpoint
- `POST /complaints` — create a complaint
- `GET /complaints` — list complaints (supports filters: `status`, `department`, `category`, `priority`)
- `GET /complaints/{id}` — get single complaint
- `PATCH /complaints/{id}/status` — update complaint status

Swagger UI

Open `http://127.0.0.1:8000/docs` while server is running.

Environment variables (example in `.env.example`)

- `APP_NAME` — application name
- `APP_ENV` — `development` or `production`
- `DATABASE_URL` — SQLAlchemy database URL (e.g. `sqlite:///./complaints.db`)
- `FRONTEND_URL` — frontend origin allowed for CORS (e.g. `http://localhost:5173`)

Example POST /complaints

Request JSON:

```json
{
  "name": "Rajesh",
  "email": "rajesh@example.com",
  "phone": "9876543210",
  "title": "Streetlight not working",
  "description": "The streetlight near my house has not been working for three days and the road is unsafe at night.",
  "location": "Coimbatore",
  "latitude": 11.0168,
  "longitude": 76.9558
}
```

Example response (trimmed):

```json
{
  "complaint_id": "CMP-0001",
  "title": "Streetlight not working",
  "description": "...",
  "category": "Streetlight",
  "department": "Electrical Department",
  "priority": "HIGH",
  "confidence": 0.95,
  "status": "Submitted",
  "location": "Coimbatore",
  "latitude": 11.0168,
  "longitude": 76.9558,
  "created_at": "2026-08-08T12:34:56.789Z"
}
```

Notes

- Do NOT commit `.env` to version control. `.env.example` contains safe example values.
- Security headers and CORS are applied in `app/main.py`.
- The AI classification logic is isolated in `app/services/ai_service.py` and can be replaced by an ML model later.
# AI Municipal Grievance / AI Complaint Routing System Backend

Backend service for the AI Municipal Grievance project.

## Run Locally

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

```bash
# Windows PowerShell
venv\Scripts\Activate.ps1
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the app:

```bash
python -m uvicorn app.main:app --reload
```

5. Verify endpoints:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/docs`
