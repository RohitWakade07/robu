import sys
import os

# Add backend directory to sys.path so 'app.*' imports resolve cleanly in Vercel
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

# Export the FastAPI instance for Vercel's Serverless Python runtime
__all__ = ["app"]
