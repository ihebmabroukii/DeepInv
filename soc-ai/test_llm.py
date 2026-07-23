import asyncio
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOllama(base_url="http://ollama:11434", model="mistral:latest", temperature=0, format="json")
prompt = ChatPromptTemplate.from_messages([
    ("system", 'Output ONLY valid JSON: {{"narrative": "test"}}'),
    ("user", "test")
])
chain = prompt | llm | StrOutputParser()

async def run():
    print(repr(await chain.ainvoke({})))

asyncio.run(run())
