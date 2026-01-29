from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.config import settings
from app.schemas.alert import NormalizedAlert
from loguru import logger

class LLMEngine:
    def __init__(self):
        # Switch to Ollama
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.AI_MODEL_NAME,
            temperature=0.1
        )
        self.parser = StrOutputParser()
        
        # Define the Analyst Persona Prompt
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Tier-2 SOC Analyst. Your job is to explain security alerts clearly to non-experts.
            
            RULES:
            1. Be concise and professional.
            2. Start with the most critical information.
            3. Explain WHAT happened, WHO was involved (IPs/Users), and WHY it matters.
            4. Do not output JSON, just plain text or markdown.
            5. If the severity is CRITICAL, emphasize the immediate risk.
            """),
            ("user", """Analyze the following security alert:
            
            Name: {alert_name}
            Severity: {severity}
            Source: {source}
            Description: {description}
            Source IP: {src_ip}
            Destination IP: {dst_ip}
            
            Write a 2-sentence summary of this event for the executive dashboard:
            """)
        ])
        
        self.chain = self.prompt | self.llm | self.parser

    async def analyze(self, alert: NormalizedAlert) -> str:
        """
        Generates a human-readable explanation for the alert.
        """
        try:
            logger.info(f"Generating AI explanation for alert: {alert.name}")
            response = await self.chain.ainvoke({
                "alert_name": alert.name,
                "severity": alert.severity.value,
                "source": alert.source_system,
                "description": alert.description or "No description provided",
                "src_ip": alert.src_ip or "Unknown",
                "dst_ip": alert.dst_ip or "Unknown"
            })
            return response
        except Exception as e:
            logger.error(f"AI Analysis failed: {e}")
            return "AI Analysis Failed (Ollama might be unreachable or loading model)"

llm_engine = LLMEngine()
