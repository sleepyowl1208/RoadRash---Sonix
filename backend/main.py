from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

from .config import settings
from .models import RaceState, AIEnvironmentResponse
from .services.gemini_service import GeminiService
from .services.firestore_service import FirestoreService

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("roadrash_backend")

# --- App Initialization ---
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Road Rash: Neon Vengeance",
    version="0.1.0"
)

# --- Middleware ---

# Error Handling Middleware
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.exception("Unhandled exception occurred")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error", "error": str(e)}
        )

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Service Dependency Injection (Simple Singleton Pattern) ---
gemini_service = GeminiService(api_key=settings.API_KEY)
firestore_service = FirestoreService(creds_path=settings.FIREBASE_CREDENTIALS_PATH)

# --- Routes ---

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy", 
        "app": settings.APP_NAME, 
        "environment": settings.ENV
    }

@app.post("/api/v1/race/sync", response_model=AIEnvironmentResponse)
async def sync_race_state(state: RaceState):
    """
    Receives current race state from frontend, logs it to Firestore,
    and returns AI-driven environment updates/commentary via Gemini.
    """
    start_time = time.time()
    
    try:
        logger.info(f"Received sync request for race: {state.race_id}")
        
        # 1. Persist State (Fire & Forget or Await based on consistency needs)
        await firestore_service.save_state(
            collection="races", 
            doc_id=state.race_id, 
            data=state.model_dump()
        )
        
        # 2. AI Analysis
        ai_response = await gemini_service.analyze_race_state(state)
        
        process_time = time.time() - start_time
        logger.info(f"Processed sync in {process_time:.4f}s")
        
        return ai_response
        
    except Exception as e:
        logger.error(f"Error in sync_race_state: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to process race state"
        )

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")
