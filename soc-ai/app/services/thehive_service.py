import aiohttp
from typing import Optional, Dict, Any
from app.core.config import settings
from loguru import logger


class TheHiveService:
    def __init__(self):
        self.url = settings.THEHIVE_URL
        # Browser-facing base for case links surfaced in the dashboard.
        self.public_url = getattr(settings, 'THEHIVE_PUBLIC_URL', None) or settings.THEHIVE_URL
        self.api_key = settings.THEHIVE_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def check_case(self, incident_id: str, ip: str) -> Optional[Dict[str, Any]]:
        """Check if a case already exists for this incident ID or IP."""
        if not self.api_key:
            logger.warning("TheHive API Key is not configured.")
            return None

        search_query = {
            "query": {
                "_or": [
                    {"_string": f"tags:{incident_id}"},
                    {"_string": f"description:{ip}"}
                ]
            }
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.url}/api/case/_search",
                    json=search_query,
                    headers=self.headers,
                    timeout=25
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and len(data) > 0:
                            case = data[0]
                            cid = case.get("id", case.get("_id"))
                            return {
                                "id": cid,
                                "caseId": case.get("caseId"),
                                "title": case.get("title"),
                                "status": case.get("status"),
                                "url": f"{self.public_url}/cases/{cid}/details"
                            }
                    else:
                        logger.warning(f"TheHive Search Error: {resp.status} - {await resp.text()}")
        except Exception as e:
            logger.error(f"Failed to query TheHive: {e}")

        return None

    async def create_case_from_data(
        self,
        incident_id: str,
        source_ip: str,
        risk_score: int,
        narrative: str,
        ai_reasoning: str,
        ai_recommendations: str,
        mitre_tactic: str = "Unknown"
    ) -> Optional[Dict[str, Any]]:
        """Create a new TheHive case from raw incident data."""
        if not self.api_key:
            logger.warning("TheHive API Key is not configured.")
            return None

        # Severity: 1=Low, 2=Medium, 3=High, 4=Critical
        severity = 1
        if risk_score >= 80:   severity = 4
        elif risk_score >= 60: severity = 3
        elif risk_score >= 40: severity = 2

        case_data = {
            "title": f"DeepInv AI: {mitre_tactic} from {source_ip}",
            "description": (
                f"**AI Narrative:**\n{narrative}\n\n"
                f"**AI Reasoning:**\n{ai_reasoning}\n\n"
                f"**Recommendations:**\n{ai_recommendations}"
            ),
            "severity": severity,
            "tags": ["DeepInv", "SOC-AI", incident_id, f"tactic:{mitre_tactic}"],
            "tlp": 2,
            "pap": 2
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.url}/api/case",
                    json=case_data,
                    headers=self.headers,
                    timeout=25
                ) as resp:
                    if resp.status == 201:
                        case = await resp.json()
                        case_id = case.get("id", case.get("_id"))
                        await self._add_observable(session, case_id, "ip", source_ip)
                        return {
                            "id": case_id,
                            "caseId": case.get("caseId"),
                            "title": case.get("title"),
                            "status": "New",
                            "url": f"{self.public_url}/cases/{case_id}/details"
                        }
                    else:
                        error_text = await resp.text()
                        logger.error(f"TheHive Create Error {resp.status}: {error_text}")
        except Exception as e:
            logger.error(f"Failed to create TheHive case: {e}")

        return None

    async def _add_observable(self, session, case_id: str, data_type: str, data: str):
        """Add an observable (e.g. IP) to an existing case."""
        if not data:
            return
        observable_data = {
            "dataType": data_type,
            "data": data,
            "tlp": 2,
            "ioc": True,
            "message": "Extracted automatically by SOC-AI"
        }
        try:
            async with session.post(
                f"{self.url}/api/case/{case_id}/artifact",
                json=observable_data,
                headers=self.headers,
                timeout=5
            ) as resp:
                if resp.status != 201:
                    logger.warning(f"Failed to add observable to TheHive case: {resp.status}")
        except Exception as e:
            logger.error(f"Error adding observable to TheHive: {e}")


thehive_service = TheHiveService()
