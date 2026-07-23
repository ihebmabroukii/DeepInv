import asyncio
from app.services.llm_engine import llm_engine
from app.schemas.alert import Incident, NormalizedAlert
from datetime import datetime

async def main():
    print("🚀 Testing LLM Connectivity...")
    
    # Create Dummy Incident
    incident = Incident(
        id="test-1",
        source_ip="127.0.0.1",
        alerts=[
            NormalizedAlert(alert_id="a1", name="Test Alert 1", severity="low", timestamp=datetime.now(), source_system="test", src_ip="127.0.0.1"),
            NormalizedAlert(alert_id="a2", name="Test Alert 2", severity="high", timestamp=datetime.now(), source_system="test", src_ip="127.0.0.1")
        ],
        created_at=datetime.now()
    )
    
    try:
        print("Sending request to LLM...")
        result = await asyncio.wait_for(llm_engine.analyze_incident(incident), timeout=300)
        print(f"✅ Success! Narrative: {result.narrative}")
        
        # Check Redis directly
        import redis.asyncio as redis
        from app.core.config import settings
        r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        history = await r.lrange("incidents:history", 0, -1)
        print(f"🔍 Redis History Count: {len(history)}")
        if history:
             print(f"Latest in Redis: {history[0][:100]}...")
             
    except Exception as e:
        import traceback
        print(f"❌ Failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
