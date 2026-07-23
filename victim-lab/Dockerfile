# Linux brute-force victim: openssh-server + Wazuh agent (host-layer detection).
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV WAZUH_MANAGER="wazuh.manager"

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg2 lsb-release openssh-server sudo procps iproute2 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the Wazuh agent (4.x stable), pointed at the manager.
RUN curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import \
    && chmod 644 /usr/share/keyrings/wazuh.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" > /etc/apt/sources.list.d/wazuh.list \
    && apt-get update \
    && apt-get install -y wazuh-agent \
    && rm -rf /var/lib/apt/lists/*

# SSH server config: allow password auth so the brute-force is meaningful.
RUN mkdir -p /run/sshd \
    && sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

# A deliberately weak account the brute-force will eventually crack (demo only).
RUN useradd -m -s /bin/bash iheb.mabrouki \
    && echo 'iheb.mabrouki:Password123' | chpasswd \
    && echo 'root:toor' | chpasswd

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 22
ENTRYPOINT ["/entrypoint.sh"]
