from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.services.llm_engine import llm_engine
from app.services.aggregator import aggregator
from loguru import logger
import json

class CopilotService:
    def __init__(self):
        # We reuse the text LLM from the existing engine
        self.llm = llm_engine.llm_text
        self.parser = StrOutputParser()

    async def get_response(self, query: str) -> str:
        try:
            logger.info(f"Copilot received query: {query}")
            
            # Fetch context from the SOC pipeline
            # Get up to 10 most recent incidents for context
            recent_incidents = await aggregator.get_recent_history()
            
            context_strings = []
            for inc in recent_incidents[:10]:
                context_strings.append(
                    f"- Incident {inc.id} (Risk: {inc.risk_score}): "
                    f"IP {inc.source_ip}, Tactic {inc.mitre_tactic}. "
                    f"Narrative: {inc.narrative}"
                )
            
            context_text = "\n".join(context_strings) if context_strings else "No recent incidents detected in the system."

            system_prompt = (
                "You are the 'Attijari SOC Copilot', an elite, highly knowledgeable AI assistant for cybersecurity analysts. "
                "Your job is to answer questions about the current security posture, explain threats, and provide actionable advice. "
                "Be concise, professional, and technical. "
                "Use the following real-time SOC context (recent incidents) to inform your answers if relevant. "
                "If the user asks something outside this context, rely on your cybersecurity knowledge.\n\n"
                "Real-time SOC Context:\n{context}"
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "{query}")
            ])

            chain = prompt | self.llm | self.parser
            
            response = await chain.ainvoke({
                "context": context_text,
                "query": query
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Copilot Error: {e}")
            return f"I encountered an error while analyzing the SOC data: {str(e)}. Please check my connection to the backend."

    async def get_response_stream(self, query: str):
        try:
            logger.info(f"Copilot stream received query: {query}")
            
            # Immediately yield to show the user we are processing
            yield "🧠 *Analyzing security context and thinking...*\n\n"
            
            recent_incidents = await aggregator.get_recent_history()
            
            context_strings = []
            # Reduced from 10 to 2 to speed up Time-To-First-Token on CPU
            for inc in recent_incidents[:2]:
                context_strings.append(
                    f"- Incident {inc.id} (Risk: {inc.risk_score}): IP {inc.source_ip}, Tactic {inc.mitre_tactic}. Narrative: {inc.narrative}"
                )
            
            context_text = "\n".join(context_strings) if context_strings else "No recent incidents detected."

            system_prompt = (
                "You are the 'Attijari SOC Copilot', an elite, highly knowledgeable AI assistant for cybersecurity analysts. "
                "Your job is to answer questions about the current security posture, explain threats, and provide actionable advice. "
                "Be concise, professional, and technical. "
                "Use the following real-time SOC context (recent incidents) to inform your answers if relevant. "
                "If the user asks something outside this context, rely on your cybersecurity knowledge.\n\n"
                "Real-time SOC Context:\n{context}"
            )

            prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("user", "{query}")])
            chain = prompt | self.llm | self.parser
            
            async for chunk in chain.astream({"context": context_text, "query": query}):
                yield chunk
                
        except Exception as e:
            logger.error(f"Copilot Stream Error: {e}")
            yield f"\n\n[Error: {str(e)}]"

copilot_service = CopilotService()
