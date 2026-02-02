from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.schemas.alert import RawAlert, Incident
from app.services.aggregator import aggregator
from app.services.normalizer import normalizer

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/incidents", response_model=list[Incident])
async def get_recent_incidents():
    """
    Returns the latest analyzed incidents for the dashboard feed.
    (Currently mocks logic using Redis or in-memory cache)
    """
    # For now, we return what's currently pending + simple mock history
    # Ideally, Aggregator should also store "completed" incidents in Redis list "incidents:history"
    # We will implement a quick fetch from aggregator
    return await aggregator.get_recent_history()

@router.post("/manual", response_model=dict)
async def receive_manual_alert(alert: RawAlert):
    """
    Endpoint to manually push an alert (e.g., from a test script or webhook).
    """
    try:
        # Normalize
        normalized = await normalizer.process(alert)
        # Aggregate
        await aggregator.ingest(normalized)
        return {"status": "processed", "id": normalized.alert_id}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
