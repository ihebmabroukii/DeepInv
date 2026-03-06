from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from app.services.threat_intel import threat_intel
from app.services.behavior import behavior_analyzer
from app.services.aggregator import aggregator
import re
import asyncio
import json
from loguru import logger
from pydantic import BaseModel, Field

class ExtractedEntities(BaseModel):
    entities: List[str] = Field(description="List of extracted main entities (users, IPs, processes).")
    mitre_tactic: str = Field(description="Mapped MITRE ATT&CK Tactic name.")

class IncidentReport(BaseModel):
    narrative: str = Field(description="Final refined technical story of the incident.")
    risk_score: int = Field(description="Assigned Risk Score from 0 to 100.")
    status: str = Field(default="investigating", description="Incident status (e.g., investigating).")
    attack_stage: str = Field(description="The stage of the attack (e.g., Exploitation).")
    threat_intel_indicators: List[str] = Field(description="List of identified threat indicators.")
    ueba_indicators: List[str] = Field(description="List of identified user behavior indicators.")

class AgentState(TypedDict):
    incident: Incident
    previous_context: str
    intel_context: str
    behavior_context: str
    extracted_entities: Dict[str, Any]
    draft_narrative: str
    final_json: Dict[str, Any]

class LLMEngine:
    def __init__(self):
        # AI Models
        self.llm_json = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.AI_MODEL_NAME,
            temperature=0,
            format="json"
        )
        self.llm_text = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.AI_MODEL_NAME,
            temperature=0
        )
        self.parser = StrOutputParser()

        # Build Graph
        workflow = StateGraph(AgentState)
        
        workflow.add_node("normalizer", self.node_normalizer)
        workflow.add_node("correlator", self.node_correlator)
        workflow.add_node("reviewer", self.node_reviewer)
        
        workflow.set_entry_point("normalizer")
        workflow.add_edge("normalizer", "correlator")
        workflow.add_edge("correlator", "reviewer")
        workflow.add_edge("reviewer", END)
        
        self.app = workflow.compile()

    async def node_normalizer(self, state: AgentState) -> Dict:
        """Agent 1: Extracts Entities and MITRE Map"""
        incident = state["incident"]
        alerts_summary = "\\n".join([f"{a.name}: {a.description}" for a in incident.alerts[:5]])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", 'You are a SOC analyst. Extract entities and map to MITRE ATT&CK. Output ONLY valid JSON with exactly these keys: {{"entities": ["string"], "mitre_tactic": "string"}}'),
            ("user", "Alerts:\n{alerts}")
        ])
        
        try:
            chain = prompt | self.llm_json | JsonOutputParser()
            res = await chain.ainvoke({"alerts": alerts_summary})
            entities = ExtractedEntities.model_validate(res).model_dump()
        except Exception as e:
            logger.error(f"Normalizer parsing failed: {e}")
            entities = {"entities": [], "mitre_tactic": "Unknown"}
            
        return {"extracted_entities": entities}

    async def node_correlator(self, state: AgentState) -> Dict:
        """Agent 2: Retrieves Semantic & Graph contexts and writes draft narrative"""
        incident = state["incident"]
        
        # 1. RAG Retrieve (using the trigger/most recent alert embedding if available)
        related_alerts_str = "No semantic context."
        if incident.alerts and incident.alerts[0].embedding:
             trigger = incident.alerts[0]
             related = await aggregator.get_related_alerts(trigger.embedding, ip=trigger.src_ip, file_hash=trigger.file_hash, limit=5)
             if related:
                 related_alerts_str = "\\n".join([f"Time: {a.timestamp}, Alert: {a.name}" for a in related])
                 
        # 2. Graph Retrieve
        ips = list(set([a.src_ip for a in incident.alerts if a.src_ip] + [a.dst_ip for a in incident.alerts if a.dst_ip]))
        graph_events = await aggregator.get_graph_alerts(ips)
        graph_str = "No graph context."
        if graph_events:
            graph_str = "\\n".join([f"{a.src_ip} -> {a.dst_ip} : {a.name}" for a in graph_events[:5]])
            
        alerts_summary = "\\n".join([f"- {a.name}" for a in incident.alerts[:10]])
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a SOC Analyst. Write a technical draft narrative of the attack based on the new alerts, historical graph events, and semantic related alerts. Describe lateral movement if IPs traverse."),
            ("user", "Target IPs: {ips}\\nNew Alerts:\\n{alerts}\\n\\nGraph History:\\n{graph}\\n\\nSemantic Context:\\n{semantic}")
        ])
        chain = prompt | self.llm_text | self.parser
        draft = await chain.ainvoke({"ips": ips, "alerts": alerts_summary, "graph": graph_str, "semantic": related_alerts_str})
        
        return {"draft_narrative": draft}

    async def node_reviewer(self, state: AgentState) -> Dict:
        """Agent 3: Final Review and Strict JSON Formatting"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", 'You are a SOC Manager. Write a final incident report. Output ONLY valid JSON with exactly these keys: {{"narrative": "string", "risk_score": 75, "status": "investigating", "attack_stage": "string", "threat_intel_indicators": [], "ueba_indicators": []}}'),
            ("user", "Draft Narrative:\n{draft}\n\nUEBA Context:\n{ueba}\n\nThreat Intel:\n{intel}\n\nExtracted Entities:\n{entities}")
        ])
        
        try:
            chain = prompt | self.llm_json | JsonOutputParser()
            res = await chain.ainvoke({
                "draft": state.get("draft_narrative", ""),
                "ueba": state.get("behavior_context", "None"),
                "intel": state.get("intel_context", "None"),
                "entities": json.dumps(state.get("extracted_entities", {}))
            })
            final_json = IncidentReport.model_validate(res).model_dump()
        except Exception as e:
            logger.error(f"Reviewer parsing failed: {e}")
            final_json = {"narrative": state.get("draft_narrative", ""), "risk_score": 50, "status": "investigating", "attack_stage": "Unknown", "threat_intel_indicators": [], "ueba_indicators": []}
            
        return {"final_json": final_json}

    async def analyze_incident(self, incident: Incident, previous_context: dict = None, intel_context: str = None) -> Incident:
        try:
            logger.info(f"LangGraph Analyzing Incident {incident.id} from {incident.source_ip}")
            
            # 1. Behavior Analysis (UEBA)
            behavior_report = "No User Context found in alerts."
            target_user = None
            for alert in incident.alerts:
                 if alert.user:
                     target_user = alert.user
                     break
                 match = re.search(r"user\\s+(\\w+)|user=(\\w+)", alert.name + " " + (alert.description or ""), re.IGNORECASE)
                 if match:
                     target_user = match.group(1) or match.group(2)
                     break
            
            if target_user:
                behavior_report = await behavior_analyzer.get_user_login_history(target_user)

            context_str = f"Prior Incident: {previous_context.get('narrative')[:200]}" if previous_context else "None"
            intel_str = intel_context if intel_context else "No Threat Intelligence found for this IP."

            initial_state = {
                "incident": incident,
                "previous_context": context_str,
                "intel_context": intel_str,
                "behavior_context": behavior_report,
            }
            
            # Execute Graph (no asyncio.wait_for — timeout handled at the Celery level)
            result = await self.app.ainvoke(initial_state)
            
            final_data = result.get("final_json", {})
            entities = result.get("extracted_entities", {})
            
            # Update Incident
            incident.narrative = final_data.get("narrative", "Analysis failed to produce narrative.")
            incident.risk_score = final_data.get("risk_score", 0)
            incident.status = final_data.get("status", "analyzed")
            incident.mitre_tactic = entities.get("mitre_tactic", "Unknown")
            incident.attack_stage = final_data.get("attack_stage", "Unknown")
            incident.threat_intel_indicators = final_data.get("threat_intel_indicators", [])
            
            return incident
            
        except asyncio.TimeoutError:
            logger.error(f"LangGraph Analysis Timed Out (Source: {incident.source_ip})")
            incident.narrative = "AI Analysis Timed Out. System under load."
            return incident
        except Exception as e:
            logger.error(f"LangGraph Analysis failed: {e}")
            incident.narrative = f"AI Analysis Failed: {str(e)}"
            return incident

llm_engine = LLMEngine()
