from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from app.services.threat_intel import threat_intel
from app.services.behavior import behavior_analyzer
import re
import asyncio
import json
from loguru import logger

class LLMEngine:
    def __init__(self):
        # Switch to Ollama
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.AI_MODEL_NAME,
            temperature=0,
            format="json"
        )
        # JSON Output Parser
        self.parser = StrOutputParser()
        
        # Define the Chain-of-Thought Analyst Persona (SIMPLIFIED FOR SPEED)
        self.incident_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a SOC Analyst.
            Analyze the following alerts and prior context.
            
            Valid MITRE Tactics: [Initial Access, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, Impact]
            
            CRITICAL INSTRUCTIONS:
            1. If THREAT INTEL finds a match, mention the 'Source' and 'Description' in your narrative.
            2. If BEHAVIORAL ANALYSIS (UEBA) says "Anomaly" or "No history", this is a HIGH RISK indicator. You MUST mention "UEBA Anomaly Detected" in the narrative.
            3. If the user is 'admin' and the IP is new, assume account compromise unless proven otherwise.
            
            OUTPUT JSON ONLY:
            {{
                "narrative": "Concise story. START with the most critical finding (Intel or UEBA).",
                "risk_score": 0-100,
                "status": "investigating" or "closed" or "escalated",
                "mitre_tactic": "Select ONE from valid list above",
                "attack_stage": "Reconnaissance" or "Exploitation" or "Actions on Objectives",
                "threat_intel_indicators": ["List", "Specific", "Indicators", "From", "Intel", "Report"],
                "ueba_indicators": ["List", "Specific", "Indicators", "From", "Behavioral", "Analysis"]
            }}
            NO EXTRA TEXT.
            """),
            ("user", """
            ## INCIDENT DATA
            Source IP: {source_ip}
            Alerts: {alert_count}
            
            ## THREAT INTELLIGENCE (External Context)
            {intel_context}
            
            ## BEHAVIORAL ANALYSIS (Internal Context)
            {behavior_context}
            
            ## PREVIOUS CONTEXT
            {previous_context}
            
            ## RAW ALERTS (Truncated)
            {alerts_json}
            
            Question: Has the situation escalated? what is the Tactic? Is this behavior normal for the user?
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

            # 2. Behavioral Analysis (UEBA)
            behavior_report = "No User Context found in alerts."
            target_user = None
            # Scan alerts for username
            for alert in incident.alerts:
                 # "Failed password for invalid user admin from..." or "user=admin"
                 # Simple regex for "user <name>" or "user=name"
                 match = re.search(r"user\s+(\w+)|user=(\w+)", alert.name + " " + alert.description, re.IGNORECASE)
                 if match:
                     target_user = match.group(1) or match.group(2)
                     break
            
            if target_user:
                behavior_report = await behavior_analyzer.get_user_login_history(target_user)

            response_str = await asyncio.wait_for(
                self.chain.ainvoke({
                    "source_ip": incident.source_ip,
                    "alert_count": len(incident.alerts),
                    "alerts_json": "\n".join(alerts_summary),
                    "previous_context": context_str,
                    "intel_context": intel_str,
                    "behavior_context": behavior_report
                }),
                timeout=160.0
            )
            
            logger.info(f"Raw LLM Response: {response_str}")
            
            
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
