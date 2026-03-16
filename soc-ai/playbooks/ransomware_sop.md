# Standard Operating Procedure (SOP): Ransomware & Data Encryption

## 1. Immediate Actions (Containment)
- **Isolate Affected Hosts**: Immediately disconnect the affected endpoints or servers from the corporate network (disable switch ports, remove network cables, or quarantine via EDR). DO NOT power down the machines; capturing memory may be required for forensics.
- **Disable Shared Drives**: Disconnect mapped network drives and cloud sync clients instantly to prevent lateral file encryption.
- **Isolate Backups**: Verify that offline and immutable backups are disconnected from the primary network to ensure they cannot be encrypted.

## 2. Escalation & Communication
- **Notify IT Leadership**: Urgently contact the Chief Information Security Officer (CISO) and the Incident Response (IR) Director.
- **Invoke Retainers**: If external help is needed, contact the retained cybersecurity forensics firm (e.g., Mandiant, CrowdStrike).

## 3. Investigation
- **Identify Patient Zero**: Search SIEM logs (Wazuh, Suricata) for the initial entry vector (e.g., phishing email click, exposed RDP port).
- **Determine Ransomware Strain**: Upload suspected encrypted files or ransom notes to safe sandboxes (e.g., VirusTotal, ID Ransomware) to identify the specific threat actor group.

## 4. Remediation & Recovery
- **Wipe and Rebuild**: Do not attempt to clean the infected machines. Wipe the systems completely and rebuild from gold images.
- **Restore from Backups**: Restore encrypted data ONLY from known continuous, immutable backups from a date prior to the initial infection.

## 5. Post-Incident
- **Force Password Resets**: Enforce a global password reset for all AD accounts and enforce mandatory MFA.
- **Review Telemetry**: Review EDR and SIEM blindly to ensure there is no active persistence or C2 beaconing.
