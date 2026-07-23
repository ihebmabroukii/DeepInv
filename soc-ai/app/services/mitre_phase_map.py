from typing import Optional
from loguru import logger

class MitrePhaseMap:
    def __init__(self):
        # Maps common rule prefixes or substrings to Kill Chain phases (1-7)
        # 1: Reconnaissance
        # 2: Weaponization / Delivery
        # 3: Exploitation
        # 4: Installation / Persistence
        # 5: Command and Control (C2)
        # 6: Action on Objectives (Exfiltration, Impact)
        
        self.phase_keywords = {
            # Reconnaissance (1)
            "scan": 1,
            "nmap": 1,
            "nikto": 1,
            "discovery": 1,
            "recon": 1,
            "ping": 1,

            # Weaponization / Delivery (2)
            "phishing": 2,
            "download": 2,
            "suspicious file": 2,
            "dropper": 2,

            # Exploitation (3)
            "exploit": 3,
            "cve-": 3,
            "rce": 3,
            "sqli": 3,
            "xss": 3,
            "bypass": 3,
            "buffer overflow": 3,
            "webshell": 3,
            
            # Installation / Persistence / Privilege Escalation / Credential Access (4)
            "credential": 4,
            "mimikatz": 4,
            "privilege": 4,
            "persistence": 4,
            "startup": 4,
            "registry": 4,
            "lsass": 4,
            "dump": 4,
            
            # Command and Control (5)
            "c2": 5,
            "beacon": 5,
            "trojan": 5,
            "cobalt strike": 5,
            "meterpreter": 5,
            "empire": 5,
            "botnet": 5,
            "dns tunnel": 5,
            "coinminer": 5,
            
            # Action on Objectives (Exfiltration / Impact) (6)
            "exfiltration": 6,
            "ransomware": 6,
            "crypto": 6,
            "wipe": 6,
            "data leak": 6,
            "archive": 6
        }

    def lookup(self, alert_name: str) -> Optional[int]:
        """
        Attempts to map an alert name/description to a MITRE Kill Chain phase.
        Returns an integer 1-6 representing the phase, or None if unknown.
        """
        if not alert_name:
            return None
            
        alert_lower = alert_name.lower()
        
        for keyword, phase in self.phase_keywords.items():
            if keyword in alert_lower:
                return phase
                
        return None

mitre_phase_map = MitrePhaseMap()
