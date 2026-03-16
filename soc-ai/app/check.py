import asyncio
from redis.asyncio import Redis
import json
async def main():
    try:
        r = Redis.from_url('redis://soc-ai-redis:6379/0', decode_responses=True)
        data = await r.lrange('incidents:history', 0, -1)
        print(f'Total incidents analyzed: {len(data)}')
        for i, d in enumerate(data):
            try:
                n = json.loads(d).get('narrative', '')
                if '🛡️' in n:
                    print(f'SUCCESS: Playbook RAG SOP Found perfectly injected at index {i}!')
                    return
            except Exception:
                pass
        print('FAILED: RAG Playbook text Not Found in any incident')
    except Exception as e:
        print("ERROR", e)

if __name__ == "__main__":
    asyncio.run(main())
