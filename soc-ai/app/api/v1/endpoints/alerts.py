from fastapi import APIRouter
from app.schemas.alert import RawAlert

router = APIRouter()

@router.post("/manual", response_model=dict)
async def receive_manual_alert(alert: RawAlert):
    """
    Endpoint to manually push an alert (e.g., from a test script or webhook).
    """
    # await normalizer.process(alert)
    return {"status": "received", "source": alert.source_system}
