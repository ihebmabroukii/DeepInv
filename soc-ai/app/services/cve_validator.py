"""
Deterministic CVE resolution.

The cve_expert LLM node *proposes* candidate CVE identifiers from the observed
tools/behaviour. Those proposals are never trusted blindly: this module filters
them against an authoritative local catalogue (a CISA-KEV / NVD export bundled
with the service, replaceable with a full feed via CVE_CATALOGUE_PATH). Any
candidate that is malformed or absent from the catalogue is dropped, so a
fabricated identifier can never reach TheHive. This converts an unbounded
hallucination risk into a bounded retrieval problem.
"""
import json
import os
import re
from typing import List, Set
from loguru import logger
from app.core.config import settings

# Strict CVE identifier form: CVE-YYYY-NNNN(NNN).
_CVE_RE = re.compile(r"^CVE-\d{4}-\d{4,7}$", re.IGNORECASE)

# Built-in authoritative seed (well-known / KEV-listed CVEs). Always available
# even if the external catalogue file is missing, so validation never silently
# passes everything. Extend by dropping the full CISA-KEV JSON at
# settings.CVE_CATALOGUE_PATH.
_SEED: Set[str] = {
    "CVE-2021-44228", "CVE-2021-45046", "CVE-2021-45105",   # Log4Shell family
    "CVE-2023-23397", "CVE-2024-21413",                      # Outlook
    "CVE-2021-34527", "CVE-2021-1675",                       # PrintNightmare
    "CVE-2020-1472",                                          # Zerologon
    "CVE-2021-26855", "CVE-2021-27065",                      # ProxyLogon
    "CVE-2021-34473", "CVE-2021-34523", "CVE-2021-31207",    # ProxyShell
    "CVE-2017-0144",                                          # EternalBlue / MS17-010
    "CVE-2019-0708",                                          # BlueKeep
    "CVE-2014-0160",                                          # Heartbleed
    "CVE-2014-6271",                                          # Shellshock
    "CVE-2018-13379", "CVE-2023-27997",                      # Fortinet
    "CVE-2019-11510",                                         # Pulse Secure
    "CVE-2019-19781",                                         # Citrix
    "CVE-2023-4966",                                          # Citrix Bleed
    "CVE-2022-1388",                                          # F5 BIG-IP
    "CVE-2022-30190",                                         # Follina
    "CVE-2022-26134", "CVE-2021-26084",                      # Confluence
    "CVE-2023-34362",                                         # MOVEit
    "CVE-2024-3400",                                          # Palo Alto PAN-OS
    "CVE-2021-22005", "CVE-2021-21972",                      # vCenter
    "CVE-2020-0796",                                          # SMBGhost
    "CVE-2016-5195",                                          # Dirty COW
    "CVE-2021-4034",                                          # PwnKit / polkit
    "CVE-2022-0847",                                          # Dirty Pipe
    "CVE-2021-3156",                                          # Sudo Baron Samedit
    "CVE-2018-7600",                                          # Drupalgeddon2
    "CVE-2017-5638",                                          # Apache Struts
    "CVE-2019-2725", "CVE-2020-14882",                       # WebLogic
    "CVE-2022-22965",                                         # Spring4Shell
    "CVE-2023-20198",                                         # Cisco IOS XE
    "CVE-2023-46604",                                         # Apache ActiveMQ
}


class CVEValidator:
    def __init__(self):
        self._catalogue: Set[str] = set()
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        self._loaded = True
        catalogue: Set[str] = {c.upper() for c in _SEED}
        path = getattr(settings, "CVE_CATALOGUE_PATH", None)
        try:
            if path and os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                ids = self._extract_ids(data)
                catalogue.update(i.upper() for i in ids)
                logger.info(f"CVE catalogue loaded: {len(ids)} entries from {path} "
                            f"(total {len(catalogue)} with seed).")
            else:
                logger.warning(f"CVE catalogue file not found at '{path}'; "
                               f"using built-in seed ({len(_SEED)} CVEs).")
        except Exception as e:
            logger.error(f"Failed to load CVE catalogue from '{path}': {e}; using built-in seed.")
        self._catalogue = catalogue

    @staticmethod
    def _extract_ids(data) -> List[str]:
        """Accepts the CISA-KEV schema {'vulnerabilities':[{'cveID':...}]},
        a plain list of IDs, a list of {'cveID':...}, or a dict keyed by CVE ID."""
        ids: List[str] = []
        if isinstance(data, dict):
            vulns = data.get("vulnerabilities")
            if isinstance(vulns, list):
                for v in vulns:
                    cid = v.get("cveID") if isinstance(v, dict) else None
                    if cid:
                        ids.append(cid)
            else:
                ids = [k for k in data.keys() if isinstance(k, str)]
        elif isinstance(data, list):
            for x in data:
                if isinstance(x, str):
                    ids.append(x)
                elif isinstance(x, dict) and x.get("cveID"):
                    ids.append(x["cveID"])
        return ids

    def validate(self, candidates: List[str]) -> List[str]:
        """Return only well-formed CVE IDs that exist in the authoritative
        catalogue, de-duplicated and order-preserving. Deterministic: the LLM's
        proposals are filtered, never trusted blindly."""
        self._load()
        valid: List[str] = []
        dropped: List[str] = []
        seen: Set[str] = set()
        for c in candidates or []:
            if not isinstance(c, str):
                continue
            cid = c.strip().upper()
            if not _CVE_RE.match(cid) or cid not in self._catalogue:
                dropped.append(c)
                continue
            if cid in seen:
                continue
            seen.add(cid)
            valid.append(cid)
        if dropped:
            logger.warning(f"CVE validator rejected {len(dropped)} unverified/fabricated "
                           f"candidate(s) not in the local catalogue: {dropped}")
        return valid


cve_validator = CVEValidator()
