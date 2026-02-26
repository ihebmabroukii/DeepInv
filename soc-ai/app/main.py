from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from contextlib import asynccontextmanager
from loguru import logger

# Setup Logging
logger.add("logs/soc-ai.log", rotation="500 MB", level="INFO")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI-Driven SOC Analyst System...")
    
    try:
        # Initialize Aggregator (RediSearch)
        logger.info("Initializing Aggregator (RediSearch)...")
        from app.services.aggregator import aggregator
        await aggregator.initialize()

        # Start Ingestion Service
        logger.info("Importing IngestionService...")
        from app.services.ingestor import ingestor
        logger.info("Starting IngestionService...")
        await ingestor.start()
        logger.info("IngestionService Started Successfully.")
    except Exception as e:
        logger.critical(f"Startup Failed: {e}")
        # Don't re-raise, let the app start so we can see health check failure
        
    logger.info("Lifespan Startup block finished")
    import asyncio
    for task in asyncio.all_tasks():
        logger.debug(f"Running Task: {task.get_coro().__name__ if hasattr(task.get_coro(), '__name__') else 'Unknown'}")
        
    yield
    
    # Shutdown
    logger.info("Shutting down SOC AI System...")
    try:
        if 'ingestor' in locals():
            await ingestor.stop()
    except Exception as e:
        logger.error(f"Shutdown Error: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Include API Router
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SOC-AI Analyst",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Serve Dashboard
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="app/templates")

@app.get("/dashboard", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    logger.info("Serving Dashboard V2 (Cache Buster)")
    return templates.TemplateResponse("dashboard_v2.html", {"request": request})

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Real-time WebSocket
from app.api.ws import manager
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive, listen for ping
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket)
