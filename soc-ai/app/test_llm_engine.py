import asyncio
from app.services.llm_engine import llm_engine
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

async def main():
    print(f"Resolved model: {llm_engine._resolve_model_name()}")
    print(f"Ollama URL: {llm_engine.llm_json.base_url}")

    try:
        resp = await llm_engine.llm_json.ainvoke([HumanMessage(content="Hello from LLMEngine test")])
        print("LLM response type:", type(resp))
        print(resp)
    except Exception as e:
        import traceback
        traceback.print_exc()

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a JSON validator. Output ONLY valid JSON: {{\"status\": \"ok\"}}"),
            ("user", "Respond with status ok")
        ])
        chain = prompt | llm_engine.llm_json | JsonOutputParser()
        parsed = await llm_engine._invoke_chain(chain, {}, "json_test", timeout=15)
        print("JSON chain parsed:", parsed)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
