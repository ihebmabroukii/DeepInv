# Standard Operating Procedure (SOP): Brute Force & Credential Abuse

## 1. Immediate Actions (Containment)
- **Account Lockout Verification**: Confirm that the targeted account(s) have been successfully locked out by Active Directory policies.
- **IP Blacklisting**: Update edge firewalls and WAFs to block the source IP address or subnet displaying high-frequency login failure behavior.
- **Kill Active Sessions**: If the brute force is followed by a **Successful Login**, assume compromise. Immediately kill all active VPN, web app, and SSO sessions for the user.

## 2. Escalation & Communication
- **Notify User**: Contact the affected employee/user through secondary channels (phone) to verify if the login attempt was legitimate.
- **Tier 2 SOC Escalation**: If the target account holds high privileges (e.g., Domain Admin, Financial Officer), escalate to a Senior Analyst immediately.

## 3. Investigation
- **Analyze Geographic Velocity (Impossible Travel)**: Determine if the source of the login attempt originates from a geographically improbable location compared to the user's normal baseline.
- **Check for Password Spraying**: Review login logs across all users to determine if this is a targeted attack on one account or a wide password spray across the entire organization.

## 4. Remediation & Recovery
- **Mandatory Password Reset**: Force a complex password reset for the targeted compromised account.
- **Enable Multi-Factor Authentication (MFA)**: Ensure that strict MFA is active and functioning correctly on the affected portal (e.g., O365, VPN).

## 5. Post-Incident
- **Tune Lockout Policies**: If the brute force attack evaded detection initially, modify IAM threshold policies (e.g., lockout after 5 attempts).
- **Review User Training**: Provide the user with guidance on password hygiene and avoiding weak credentials.
