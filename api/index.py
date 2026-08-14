import sys
import os

backend_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "AI-Municipal-Grievance backend", "member2-backend")
)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app  # noqa: E402, F401
