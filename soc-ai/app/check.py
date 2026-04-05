import asyncio
from redis.asyncio import Redis
import json

async def main():
    try:
        r = Redis.from_url('redis://soc-ai-redis:6379/0', decode_responses=True)
        data = await r.lrange('incidents:history', 0, 2)  # top 3
        for d_raw in data:
            d = json.loads(d_raw)
            ai_r = d.get('ai_reasoning', '')
            ai_rec = d.get('ai_recommendations', '')
            if len(ai_r) > 50 or len(ai_rec) > 50:
                print(f'FOUND RICH INCIDENT: {d["id"]}')
                print(f'  ai_reasoning ({len(ai_r)} chars): {ai_r[:300]}')
                print(f'  ai_recommendations ({len(ai_rec)} chars): {ai_rec[:300]}')
                return
            else:
                print(f'  EMPTY: {d["id"]} r={len(ai_r)} rec={len(ai_rec)} status={d["status"]}')
        print('No new rich incident found yet.')
    except Exception as e:
        print("ERROR", e)

asyncio.run(main())
