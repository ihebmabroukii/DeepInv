from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.copilot_service import copilot_service

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

@router.post("/copilot")
async def ask_copilot(request: ChatRequest):
    if not request.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    return StreamingResponse(
        copilot_service.get_response_stream(request.query),
        media_type="text/plain"
    )
