import aiohttp
from typing import Optional, Dict, Any, List
from app.core.config import settings
from loguru import logger

class CortexService:
    def __init__(self):
        self.url = settings.CORTEX_URL
        # Browser-facing base for links surfaced in the dashboard.
        self.public_url = getattr(settings, 'CORTEX_PUBLIC_URL', None) or settings.CORTEX_URL
        self.api_key = getattr(settings, 'CORTEX_API_KEY', None)
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def check_analysis(self, observable: str, analyzer_prefix: str = "VirusTotal") -> Optional[List[Dict[str, Any]]]:
        """
        Check if the observable has been analyzed recently in Cortex. Only jobs
        from `analyzer_prefix` count, so a cached result matches the analyzer the
        button would trigger (avoids showing an old AbuseIPDB run for a VT click).
        """
        if not self.api_key:
            logger.warning("Cortex API Key is not configured.")
            return None

        search_query = {
            "query": {
                "_string": f"data:{observable}"
            },
            "sort": "-createdAt",
            "range": "0-5"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.url}/api/job/_search", 
                    json=search_query, 
                    headers=self.headers, 
                    timeout=5
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and len(data) > 0:
                            # Keep only jobs from the preferred analyzer so a cached
                            # run matches what the button triggers.
                            results = []
                            for job in data:
                                name = job.get("analyzerName") or ""
                                if analyzer_prefix and not name.startswith(analyzer_prefix):
                                    continue
                                results.append({
                                    "id": job.get("id"),
                                    "analyzerName": name,
                                    "status": job.get("status"),
                                    "report": job.get("report", {}).get("summary", "No summary available"),
                                    "url": f"{self.public_url}/index.html#/jobs/{job.get('id')}",
                                })
                            return results
                        return []
                    else:
                        logger.warning(f"Cortex Search Error: {resp.status}")
        except Exception as e:
            logger.error(f"Failed to query Cortex: {e}")
            
        return None

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single Cortex job's current status + report summary by id.
        Used to show the *result* of a previously-triggered analysis on repeat."""
        if not job_id or not self.api_key:
            return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.url}/api/job/{job_id}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10,
                ) as resp:
                    if resp.status != 200:
                        return None
                    job = await resp.json()
                    report = job.get("report") or {}
                    summary = report.get("summary") if isinstance(report, dict) else None
                    if not summary:
                        summary = "Analysis complete" if job.get("status") == "Success" else job.get("status", "No result yet")
                    return {
                        "id": job.get("id"),
                        "analyzerName": job.get("analyzerName"),
                        "status": job.get("status"),
                        "report": summary if isinstance(summary, str) else str(summary)[:300],
                        "url": f"{self.public_url}/index.html#/jobs/{job.get('id')}",
                    }
        except Exception as e:
            logger.error(f"Failed to fetch Cortex job {job_id}: {e}")
        return None

    async def _select_analyzer(self, data_type: str) -> Optional[Dict[str, Any]]:
        """
        Pick an enabled analyzer that supports the given data type. Analyzer
        names/versions differ per Cortex install, so resolve dynamically rather
        than hardcoding an id (e.g. VirusTotal_GetReport_3_0 vs _3_1).
        """
        try:
            async with aiohttp.ClientSession() as session:
                # NOTE: send only the auth header — a JSON content-type on a
                # bodyless GET makes Cortex try to parse an empty body (400).
                async with session.get(
                    f"{self.url}/api/analyzer",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10,
                ) as resp:
                    if resp.status != 200:
                        logger.error(f"Cortex analyzer list error {resp.status}: {await resp.text()}")
                        return None
                    analyzers = await resp.json()
        except Exception as e:
            logger.error(f"Failed to list Cortex analyzers: {e}")
            return None

        matching = [a for a in analyzers if data_type in (a.get("dataTypeList") or [])]
        if not matching:
            return None
        # Prefer high-signal reputation analyzers when several match.
        # VirusTotal first: richest report for IPs/domains/hashes.
        preference = ["VirusTotal", "AbuseIPDB", "URLhaus", "OpenCTI", "Shodan", "MalwareBazaar"]
        for pref in preference:
            for a in matching:
                if (a.get("name") or "").startswith(pref):
                    return a
        return matching[0]

    async def trigger_analysis(self, observable: str, data_type: str = "ip", analyzer_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Trigger an analysis job in Cortex for the given observable. The analyzer
        is resolved dynamically from those enabled in this Cortex instance.
        """
        if not self.api_key:
            logger.warning("Cortex API Key is not configured.")
            return None

        analyzer = await self._select_analyzer(data_type)
        if not analyzer:
            logger.error(f"No enabled Cortex analyzer supports data type '{data_type}'.")
            return None
        analyzer_id = analyzer["id"]
        analyzer_name = analyzer.get("name", analyzer_id)

        job_data = {
            "data": observable,
            "dataType": data_type,
            "tlp": 2,
            "message": "Triggered manually from DeepInv Dashboard"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.url}/api/analyzer/{analyzer_id}/run", 
                    json=job_data, 
                    headers=self.headers, 
                    timeout=5
                ) as resp:
                    if resp.status == 200 or resp.status == 201:
                        job = await resp.json()
                        return {
                            "id": job.get("id"),
                            "status": job.get("status"),
                            "analyzerName": analyzer_name,
                            # Cortex UI is a hash-routed SPA; /job/{id} hits the API and 404s.
                            "url": f"{self.public_url}/index.html#/jobs/{job.get('id')}"
                        }
                    else:
                        error_text = await resp.text()
                        logger.error(f"Cortex Run Error {resp.status}: {error_text}")
        except Exception as e:
            logger.error(f"Failed to trigger Cortex analysis: {e}")

        return None

cortex_service = CortexService()
