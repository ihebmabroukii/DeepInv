# Standard Operating Procedure (SOP): Phishing & Malicious Email

## 1. Immediate Actions (Containment)
- **Email Retraction (Hard Delete)**: Use email hygiene tools (e.g., O365 Defender, Proofpoint) to quarantine or permanently delete the malicious email from all user inboxes across the company.
- **Block Malicious Infrastructure**: Add the sender domain, reply-to address, and any embedded malicious URLs to the Web Proxy and Firewall blocklists.

## 2. Escalation & Communication
- **Company-Wide Alert**: If a significant campaign bypasses filters, send a high-priority warning to all staff not to click on the specific email subject.
- **Security Awareness Team**: Notify the team responsible for user training.

## 3. Investigation
- **Determine User Interaction**: Check endpoint logs and web proxy logs to determine if any users clicked the malicious link, downloaded the attachment, or submitted credentials to a fake portal.
- **Analyze the Payload**: Submit the malicious attachment (if any) to a sandbox environment (e.g., Cuckoo, Any.Run) to determine its behavior, C2 infrastructure, and persistence methods.

## 4. Remediation & Recovery
- **If Credentials Were Submitted**: Immediately force a password reset for the affected users and revoke active MFA tokens.
- **If Malware Was Downloaded**: Isolate the endpoint from the network, initiate a full EDR scan, and follow the Malware SOP if an infection is confirmed.

## 5. Post-Incident
- **Tune Email Gateway**: Update spam and phishing filters with the newly discovered indicators of compromise (IOCs).
- **Targeted Training**: Assign mandatory anti-phishing training to users who repeatedly fall for simulated or actual phishing campaigns.
