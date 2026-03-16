# Standard Operating Procedure (SOP): Data Exfiltration

## 1. Immediate Actions (Containment)
- **Throttle / Block Outbound Traffic**: If an active exfiltration stream is detected, implement a strict rate limit or immediate block at the perimeter firewall for the destination IP or domain.
- **Suspend Compromised Credentials**: If the exfiltration is tied to a specific user account (e.g., VPN access, compromised DB credentials), immediately disable the account in Active Directory and revoke active sessions.

## 2. Escalation & Communication
- **Data Privacy Officer (DPO)**: Inform the DPO immediately, as exfiltration of PII/PHI may trigger mandatory regulatory reporting (e.g., GDPR, CCPA, HIPAA).
- **Legal Team**: Inform the legal department regarding potential breach disclosure obligations.

## 3. Investigation
- **Determine Scope of Breach**: Use firewall, web proxy, and database audit logs to determine the exact volume of data transmitted.
- **Identify Data Classification**: Determine if the exfiltrated data originated from critical financial segments, PII databases, or public web servers.

## 4. Remediation & Recovery
- **Revoke Access Keys**: If cloud storage keys or service principals were used to bypass controls, rotate all related API keys and secrets immediately.
- **Audit Network Segmentation**: If the data jumped across VLAN zones, review ACL rules and restrict direct database outbound access to the internet.

## 5. Post-Incident
- **Implement DLP**: Tune the Data Loss Prevention (DLP) solution to strictly control external uploads (e.g., blocking mega.nz, Dropbox, external drives).
- **Review Third-Party Access**: Restrict access to vendors if their accounts were tied to the breach.
