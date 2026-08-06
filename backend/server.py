import os
import sys

# Ensure the repo root is importable so `backend.*` resolves even when uvicorn
# is started from inside the `backend/` directory (e.g. `uvicorn server:app`).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.routes.benchmarks import router as benchmarks_router
from backend.routes.analysis import router as analysis_router
from backend.routes.requests import router as requests_router
from backend.routes.comparison import router as comparison_router
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="IT Procurement Advisory API - MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requests_router)
app.include_router(analysis_router)
app.include_router(benchmarks_router)
app.include_router(comparison_router)


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import HTTPException

@app.get("/api")
async def root():
    return {"service": "IT Procurement Advisory API - MVP", "status": "ok"}

# Mount React static files (only works if frontend/build exists)
frontend_build_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "build")

if os.path.exists(frontend_build_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build_dir, "static")), name="static")

    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        # Allow requests to /api to hit the API, not the react app
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Serve React frontend for all other routes
        file_path = os.path.join(frontend_build_dir, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_build_dir, "index.html"))
