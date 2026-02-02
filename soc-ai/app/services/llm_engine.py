from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from loguru import logger

class LLMEngine:
    def __init__(self):
        # Switch to Ollama
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.AI_MODEL_NAME,
            temperature=0.1,
            format="json"
        )
        # JSON Output Parser
        self.parser = StrOutputParser()
        
        # Define the Chain-of-Thought Analyst Persona (SIMPLIFIED FOR SPEED)
        self.incident_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a SOC Analyst.
            Analyze the following alerts and prior context.
            
            Valid MITRE Tactics: [Initial Access, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, Impact]
            
            OUTPUT JSON ONLY:
            {{
                "narrative": "Concise story of what happened.",
                "risk_score": 0-100,
                "status": "investigating" or "closed" or "escalated",
                "mitre_tactic": "Select ONE from valid list above",
                "attack_stage": "Reconnaissance" or "Exploitation" or "Actions on Objectives",
                "threat_intel_indicators": ["List", "Specific", "Indicators", "From", "Intel", "Report"]
            }}
            NO EXTRA TEXT.
            """),
            ("user", """
            THREAT INTELLIGENCE:
            {intel_context}

            PRIOR CONTEXT: {previous_context}
            
            ALERTS ({alert_count}):
            {alerts_json}
            
            Question: Has the situation escalated? what is the Tactic?
            JSON Report:
            """)
        ])
        
        self.chain = self.incident_prompt | self.llm | self.parser

    async def analyze_incident(self, incident: Incident, previous_context: dict = None, intel_context: str = None) -> Incident:
        """
        Analyzes an aggregated incident using Chain-of-Thought.
        """
        try:
            logger.info(f"Analyzing Incident {incident.id} from {incident.source_ip}")
            
            # Prepare alerts summary for AI
            # Limit to 10 alerts to ensure speed
            max_alerts = 10
            alerts_to_show = incident.alerts[:max_alerts]
            
            alerts_summary = [
                f"- {a.timestamp}: {a.name} ({a.severity.value})" 
                for a in alerts_to_show
            ]
            
            if len(incident.alerts) > max_alerts:
                alerts_summary.append(f"... +{len(incident.alerts) - max_alerts} more.")
            
            # Format Context String
            context_str = "None"
            if previous_context:
                context_str = (
                    f"Prior Incident: {previous_context.get('narrative')[:200]}"
                )
            
            # Format Intel String
            intel_str = intel_context if intel_context else "No Threat Intelligence found for this IP."

            import asyncio
            response_str = await asyncio.wait_for(
                self.chain.ainvoke({
                    "source_ip": incident.source_ip,
                    "alert_count": len(incident.alerts),
                    "alerts_json": "\n".join(alerts_summary),
                    "previous_context": context_str,
                    "intel_context": intel_str
                }),
                timeout=160.0
            )
            
            logger.info(f"Raw LLM Response: {response_str}")
            
            # Parse JSON response
            import json
            import re
            
            # Extract JSON from potential markdown or text
            match = re.search(r"\{.*\}", response_str, re.DOTALL)
            if match:
                clean_json = match.group(0)
                data = json.loads(clean_json)
            else:
                layout = response_str[:200]
                logger.warning(f"Failed to find JSON in: {layout}...")
                data = {} 
            
            # Update Incident
            incident.narrative = data.get("narrative", "Analysis failed to produce narrative.")
            incident.risk_score = data.get("risk_score", 0)
            incident.status = data.get("status", "analyzed")
            incident.mitre_tactic = data.get("mitre_tactic", "Unknown")
            incident.attack_stage = data.get("attack_stage", "Unknown")
            incident.threat_intel_indicators = data.get("threat_intel_indicators", [])
            
            return incident
            
        except asyncio.TimeoutError:
            logger.error(f"Incident Analysis Timed Out (Source: {incident.source_ip})")
            incident.narrative = "AI Analysis Timed Out. System under load."
            return incident
        except Exception as e:
            logger.error(f"Incident Analysis failed: {e}")
            incident.narrative = f"AI Analysis Failed: {str(e)}"
            return incident

llm_engine = LLMEngine()
