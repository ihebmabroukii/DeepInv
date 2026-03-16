import asyncio
from redis.asyncio import Redis
import json
async def main():
    try:
        r = Redis.from_url('redis://localhost:6379/0', decode_responses=True)
        data = await r.lrange('incidents:history', 0, -1)
        print(f'Total: {len(data)}')
        for i, d in enumerate(data):
            try:
                n = json.loads(d).get('narrative', '')
                if '🛡️' in n:
                    print(f'SUCCESS: RAG Playbook Found at index {i}!')
                    return
            except Exception:
                pass
        print('FAILED: Not Found')
    except Exception as e:
        print("ERROR", e)

if __name__ == "__main__":
    asyncio.run(main())
