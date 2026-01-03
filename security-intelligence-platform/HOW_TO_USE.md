# SecureBank SOC - Security Intelligence Platform User Guide

## Getting Started

### 1. Login
- Navigate to the login page
- Enter your credentials (email and password)
- Optionally enable MFA (Multi-Factor Authentication) for enhanced security
- Click "Sign In" to access the dashboard

### 2. Theme Selection
- **Toggle Theme**: Click the sun/moon icon in the top-right corner of the header
  - **Dark Mode** (default): Optimized for SOC operations in low-light environments with high contrast
  - **Light Mode**: Professional banking interface with soft neutrals for daytime use
- Your theme preference is automatically saved to your browser

---

## Main Navigation

Access different sections via the left sidebar:

### Overview Dashboard (Home)
**Purpose**: Get a comprehensive view of your security posture at a glance

**Key Features**:
- **Global Risk Gauge**: Animated meter showing current security risk level (0-100)
  - Green (0-30): Low Risk
  - Yellow (31-60): Medium Risk
  - Orange (61-80): High Risk
  - Red (81-100): Critical Risk
- **Active Threats**: Count and trend of current security threats
- **Asset Health**: Status of monitored assets across your infrastructure
- **Recent Events**: Latest 5 security events with quick actions
- **Trust Score Distribution**: Pie chart showing TLS/SSL certificate trust levels
- **Events Timeline**: 7-day trend of security events

**How to Use**:
1. Check the Global Risk Gauge first to understand overall security status
2. Review Active Threats for immediate action items
3. Scan Recent Events for latest security incidents
4. Click "View All Events" to investigate further

---

### Assets & Trust
**Purpose**: Visualize and manage your network infrastructure and TLS/SSL trust relationships

**Key Features**:
- **Network Topology Graph**: Interactive visualization of your infrastructure
  - **Green Lines**: Verified trusted TLS/SSL connections
  - **Red Lines**: Untrusted or expired certificates
  - **Orange Lines**: Self-signed or low-trust certificates
- **Asset Cards**: Detailed information for each node
  - IP addresses
  - Certificate expiration dates
  - Trust scores
  - Connection status

**How to Use**:
1. View the network graph to identify trust relationships
2. Click on any node to see detailed asset information
3. Identify red connections for immediate attention
4. Review certificate expiration dates to prevent outages
5. Use filters to focus on specific asset types or trust levels

**Color Legend**:
- 🟢 **Emerald**: Verified trusted connections (90-100% trust)
- 🟠 **Orange**: Medium trust connections (50-89% trust)
- 🔴 **Red**: Untrusted connections (<50% trust)

---

### Security Events
**Purpose**: AI-powered security event analysis with intelligent remediation

**Key Features**:
- **Event List**: Sortable and filterable security events
- **AI Analysis**: Each event includes:
  - **Confidence Score**: AI's certainty level (0-100%)
  - **Threat Assessment**: Severity rating
  - **Reasoning**: Explainable AI breakdown of detection logic
  - **Remediation Commands**: Copy-ready CLI commands
- **Event Expansion**: Click any event to see full details
- **Quick Actions**: One-click command copying

**How to Use**:
1. Review events sorted by severity (Critical → High → Medium → Low)
2. Click "Show AI Analysis" on any event to see detailed reasoning
3. Read the "Why flagged" section to understand detection logic
4. Copy remediation commands with one click
5. Execute commands in your terminal or SIEM
6. Mark events as resolved after remediation

**Confidence Score Guide**:
- 95-100%: High confidence - immediate action recommended
- 85-94%: Medium-high confidence - investigate promptly
- 70-84%: Medium confidence - review and validate
- Below 70%: Low confidence - may require manual verification

---

### Rules & Automation
**Purpose**: Create visual security workflows and automated response rules

**Key Features**:
- **Visual Rule Builder**: Drag-and-drop workflow creation
- **Trigger Conditions**: 
  - Event type matching
  - Severity thresholds
  - IP range filters
  - Time-based conditions
- **Actions**:
  - Send notifications (Email, Slack, PagerDuty)
  - Block IPs automatically
  - Quarantine assets
  - Execute custom scripts
  - Trigger playbooks

**How to Use**:
1. Click "Create New Rule" to start
2. **Define Triggers**:
   - Select event type (e.g., "Failed Login Attempt")
   - Set severity threshold (e.g., "High or Critical")
   - Add conditions (e.g., "More than 5 attempts in 5 minutes")
3. **Define Actions**:
   - Add notification channels
   - Configure automated blocking
   - Set up escalation paths
4. **Test Rule**: Use the preview mode to simulate
5. **Activate**: Toggle rule to "Active" state
6. Monitor rule execution in the timeline

**Example Rules**:
- Auto-block IPs after 10 failed login attempts
- Alert on-call engineer for critical events
- Quarantine assets with expired certificates
- Escalate unresolved high-severity events after 30 minutes

---

### AI Insights
**Purpose**: Deep AI analysis and pattern recognition across your security data

**Features**:
- Anomaly detection
- Threat pattern identification
- Predictive risk modeling
- Behavioral analysis

---

### Timeline
**Purpose**: Historical view of all security events and system changes

**Features**:
- Chronological event log
- Filterable by date range, severity, asset
- Export capabilities for compliance reporting

---

## Top Bar Features

### Organization Selector
- Switch between different SOC environments (Global SOC, US East, EU West)
- Each organization has independent data and configurations

### Environment Indicator
- Shows current environment (Production, Staging, Development)
- Helps prevent accidental changes in production

### Global Risk Level
- Real-time indicator of overall security posture
- Color-coded for quick assessment:
  - 🟢 **Green**: Secure
  - 🟡 **Yellow**: Elevated
  - 🟠 **Orange**: High
  - 🔴 **Red**: Critical

### Context-Aware Search
- Search across all assets, events, and rules
- Supports:
  - Asset names and IPs
  - Event IDs
  - Rule names
  - Certificate fingerprints

---

## Best Practices

### Daily Workflow
1. **Morning Check**: Review Overview Dashboard for overnight events
2. **Triage**: Prioritize critical and high-severity events
3. **Investigation**: Use AI Analysis to understand threat context
4. **Remediation**: Execute recommended commands
5. **Documentation**: Add notes to events for audit trail
6. **Review**: Check Assets & Trust for certificate expirations

### Security Operations
- **Act on AI Confidence**: Trust high-confidence (95%+) alerts
- **Validate Medium Confidence**: Review 70-85% confidence events manually
- **Update Rules**: Continuously refine automation rules based on false positives
- **Monitor Trends**: Use Timeline and Dashboard to spot patterns
- **Certificate Management**: Review Assets & Trust weekly for expiring certificates

### Performance Tips
- Use filters to narrow down large event lists
- Collapse sidebar (arrow button at bottom) for more screen space
- Enable dark mode for extended monitoring sessions
- Create saved searches for frequently accessed queries

---

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Focus search bar
- `Ctrl/Cmd + B`: Toggle sidebar
- `Ctrl/Cmd + D`: Jump to dashboard
- `Ctrl/Cmd + E`: Jump to events
- `Esc`: Close expanded event details

---

## Support & Troubleshooting

### Common Issues
- **Events not loading**: Check environment selector, may be viewing wrong org
- **AI analysis unavailable**: Refresh page, AI engine may be updating
- **Commands not working**: Verify you have necessary permissions on target systems

### Getting Help
- Contact SOC administrator for access issues
- Review AI reasoning for detection logic questions
- Check Timeline for system change history

---

## Security Notes

- **Session Timeout**: Automatic logout after 30 minutes of inactivity
- **MFA Required**: Recommended for all production access
- **Audit Logging**: All actions are logged for compliance
- **Data Retention**: Events retained for 90 days by default
- **Access Control**: Role-based permissions enforced throughout

---

## Updates & Maintenance

The platform updates automatically with:
- New threat detection models
- Enhanced AI reasoning capabilities
- Additional integrations
- Performance improvements

Check the changelog in Settings for recent updates.
