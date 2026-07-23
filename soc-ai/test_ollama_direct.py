import asyncio
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from app.core.config import settings

async def main():
    print(f"Connecting to Ollama at {settings.OLLAMA_BASE_URL} for model {settings.AI_MODEL_NAME}...")
    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.AI_MODEL_NAME,
        temperature=0,
    )
    try:
        resp = await llm.ainvoke([HumanMessage(content="Hello, are you there?")])
        print("✅ Response received:")
        print(resp.content)
    except Exception as e:
        import traceback
        print("❌ Error calling Ollama:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
