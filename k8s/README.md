# Kubernetes Deployment — AI-Driven SOC Platform

Kubernetes manifests for the AI-driven SOC platform, organised by tier. The
stack was originally built with Docker Compose (see the `docker-compose.yml`
files at the repo root and in `soc-tier1/`, `soc-tier2/`, `soc-ai/`); these
manifests are the Kubernetes equivalent for cluster deployment.

```
kubectl apply -k k8s/          # deploy everything
kubectl -n soc get pods        # watch it come up
kubectl -n soc get svc,ingress
```

## Architecture (three tiers + platform + AI engine)

| Tier | Namespace `soc` workloads | Kind |
|------|---------------------------|------|
| **Platform** | Flask backend, Nginx, PostgreSQL | Deployment / Deployment / StatefulSet |
| **Tier 1 – Detection** | Wazuh manager, Wazuh indexer, Wazuh dashboard, ModSecurity WAF, WireGuard | StatefulSet ×2, Deployment ×3 |
| **Tier 2 – Threat intel** | TheHive (+Cassandra, Elasticsearch), Cortex (+Elasticsearch), OpenCTI (+Elasticsearch, Redis, MinIO, RabbitMQ, worker, MITRE & TheHive connectors) | mixed |
| **AI engine** | Ollama (GPU), SOC-AI (FastAPI), Celery worker, Redis | Deployment ×4 |

Databases and search/state stores (PostgreSQL, Cassandra, all Elasticsearch
instances, MinIO, Wazuh manager/indexer, Ollama models, Redis) are
**StatefulSets / PVCs** so their data survives pod restarts. Stateless
services (backend, SOC-AI API) are **Deployments** and scale horizontally.

## Prerequisites

1. A Kubernetes cluster. Locally: `k3s`, `minikube --driver=docker`, or `kind`.
2. A default **StorageClass** (minikube/k3s ship one) for the PVCs.
3. An **ingress controller** (e.g. `ingress-nginx`) for `50-ingress.yaml`.
4. For GPU inference, the **NVIDIA device plugin** on the node:
   ```
   kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.15.0/deployments/static/nvidia-device-plugin.yml
   ```
   The Ollama pod requests `nvidia.com/gpu: 1` (runs on the RTX 4070 SUPER host).

## Images you must build & push

Two services build from local source. Build them, push to a registry, and the
image names in the manifests already point at `ghcr.io/ihebmabroukii/...`:

```
docker build -t ghcr.io/ihebmabroukii/soc-ai:latest ./soc-ai
docker build -t ghcr.io/ihebmabroukii/security-platform-backend:latest ./security-intelligence-platform-backend
docker push ghcr.io/ihebmabroukii/soc-ai:latest
docker push ghcr.io/ihebmabroukii/security-platform-backend:latest
```

All other images are public (Wazuh, TheHive, Cortex, OpenCTI, Elasticsearch…).

## Secrets

`01-config-secrets.yaml` ships with **placeholder** values (`CHANGE_ME`). Do not
commit real credentials. Either edit the Secret before applying, or create it
at deploy time:

```
kubectl -n soc create secret generic soc-secrets \
  --from-literal=POSTGRES_PASSWORD='...' \
  --from-literal=OPENCTI_TOKEN='...' \
  --from-literal=CORTEX_API_KEY='...' \
  # ...etc
```

TLS for Nginx: `kubectl -n soc create secret tls nginx-tls --cert=tls.crt --key=tls.key`

## Why Kubernetes over Docker Compose here

- **Self-healing** — a crashed pod is rescheduled automatically.
- **Horizontal scaling** — the stateless SOC-AI API scales via the
  `HorizontalPodAutoscaler` in `50-ingress.yaml` (2→6 pods on CPU load).
- **Rolling updates** — zero-downtime deploys of the AI engine.
- **Stateful vs stateless separation** — StatefulSets with stable storage for
  data stores, Deployments for scalable services.
- **GPU scheduling** — the device plugin lets the scheduler place Ollama on a
  GPU node with a declared `nvidia.com/gpu` resource.

## Compose → Kubernetes mapping (quick reference)

| Compose concept | Kubernetes equivalent |
|---|---|
| `service` | Deployment or StatefulSet + Service |
| `image: build: .` | pre-built image in a registry |
| named volume | PVC / `volumeClaimTemplates` |
| `depends_on` | readiness probes + ret/reconnect |
| `environment:` | env / `envFrom` (ConfigMap) + Secret |
| container DNS name | Service name (in-namespace DNS) |
| `ports: host:container` | Service (ClusterIP/LoadBalancer) + Ingress |
| `deploy.resources` | `resources.requests/limits` |
| `restart: always` | default Deployment/StatefulSet behaviour |
