-- Insert super admin user (this assumes user 'badi' already registered)
-- After user registers with email, we'll update their role to super_admin

-- Seed some sample security events
INSERT INTO public.security_events (title, description, severity, status, ai_confidence, ai_explanation, remediation_commands, region, department)
VALUES 
  (
    'Suspicious SSH Login Attempts',
    'Multiple failed SSH login attempts detected from IP 192.168.1.100',
    'high',
    'active',
    0.92,
    'Pattern matches known brute-force attack signatures. Source IP has been flagged in 3 threat intelligence feeds.',
    ARRAY['sudo fail2ban-client set sshd banip 192.168.1.100', 'iptables -A INPUT -s 192.168.1.100 -j DROP'],
    'us_east',
    'security'
  ),
  (
    'Unusual Data Exfiltration Pattern',
    'Large volume of data transferred to external endpoint',
    'critical',
    'investigating',
    0.87,
    'Data transfer volume exceeds baseline by 340%. Destination IP is newly registered domain.',
    ARRAY['tcpdump -i eth0 host 203.0.113.45 -w capture.pcap', 'block endpoint 203.0.113.45'],
    'eu_central',
    'financial'
  ),
  (
    'Malware Signature Detected',
    'Known ransomware signature found in file upload',
    'critical',
    'resolved',
    0.98,
    'File hash matches WannaCry variant. Sandbox analysis confirms malicious behavior.',
    ARRAY['quarantine /tmp/suspicious_file.exe', 'scan all systems with updated signatures'],
    'global',
    'it'
  );

-- Seed some sample assets
INSERT INTO public.assets (name, type, ip_address, status, trust_level, region, department)
VALUES
  ('web-server-01', 'Server', '10.0.1.10', 'active', 'verified', 'us_east', 'it'),
  ('db-master-01', 'Database', '10.0.2.20', 'active', 'verified', 'us_east', 'financial'),
  ('workstation-042', 'Workstation', '10.0.3.42', 'active', 'trusted', 'eu_central', 'hr'),
  ('api-gateway', 'Gateway', '10.0.4.1', 'active', 'verified', 'global', 'security'),
  ('unknown-device', 'Unknown', '192.168.100.50', 'active', 'suspicious', 'us_east', 'security');
