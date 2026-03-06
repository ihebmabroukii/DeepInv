import asyncio
from redis.asyncio import Redis

async def test_redis():
    redis_client = Redis.from_url("redis://localhost:6379/0", decode_responses=True)
    keys = await redis_client.keys("alerts:*")
    print(f"Keys found: {keys}")
    if keys:
        for k in keys:
            count = await redis_client.llen(k)
            print(f"Key {k} has {count} items")

if __name__ == "__main__":
    asyncio.run(test_redis())
