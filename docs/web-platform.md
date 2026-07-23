# Security Intelligence Platform

A comprehensive security intelligence dashboard and management platform featuring a modern Next.js frontend and a robust Flask backend with a Dual-Database architecture (Local PostgreSQL & Remote Supabase).

## 🚀 Overview

The Security Intelligence Platform is designed to provide real-time insights and management capabilities for security operations. It consists of three main components:

-   **Frontend**: A responsive dashboard built with **Next.js 16**, **Tailwind CSS 4**, and **Radix UI**.
-   **Backend**: A RESTful API built with **Flask**, serving as the orchestration layer for agents and data.
-   **Database**: 
    -   **Default**: Local **PostgreSQL** running in Docker for streamlined development and data sovereignty.
    -   **Optional**: Cloud **Supabase** mode for production deployments.

## 🛠️ Technology Stack

### Frontend (`/security-intelligence-platform`)
-   **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/) (Icons)
-   **Network**: [TanStack Query](https://tanstack.com/query)
-   **Validation**: [Zod](https://zod.dev/)

### Backend (`/security-intelligence-platform-backend`)
-   **Framework**: [Flask](https://flask.palletsprojects.com/)
-   **Database Driver**: [PsychoPG2](https://pypi.org/project/psycopg2/) (PostgreSQL)
-   **API Documentation**: [Flasgger](https://github.com/flasgger/flasgger) (Swagger UI)
-   **Mode**: Dual-DB Support (Auto-switches between Local Postgres and Cloud Supabase)

### Infrastructure
-   **Docker**: Containerized PostgreSQL database.

## 📋 Prerequisites

-   [Node.js](https://nodejs.org/) (Latest LTS)
-   [Python](https://www.python.org/) (3.8+)
-   [Docker & Docker Compose](https://www.docker.com/)

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd DeepInv
    ```

2.  **Start the Database (Docker)**:
    This will spin up a local PostgreSQL instance on port 5432.
    ```bash
    docker-compose up -d
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd security-intelligence-platform
    npm install
    ```

4.  **Install Backend Dependencies**:
    ```bash
    cd ../security-intelligence-platform-backend
    pip install -r requirements.txt
    ```

## 🏃‍♂️ Running the Project

To ensure stability, please run the Backend and Frontend in **separate terminals**.

### Terminal 1: Backend
```bash
cd security-intelligence-platform-backend
python run.py
```
> The backend will- **Hosts File**: For best results, map `127.0.0.1 platform.bank.tn` in your `/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`.

## 🧠 System Architecture & Data Flow

High-level overview of the secure agent communication implementation.

### 🛡️ Components
1.  **Nginx (Reverse Proxy)**: Acts as the **mTLS Gatekeeper**. Listens on Port 443 (SSL).
    *   **Public Access**: `/api/v1/agents/bootstrap` (One-way TLS) and `/static/` (Install Scripts).
    *   **Restricted Access**: All other routes (e.g., `/verify`, `/heartbeat`) REQUIRE a valid Client Certificate signed by our internal CA.
2.  **Backend (Flask)**:
    *   **PKI Manager**: `app/pki.py` handles Certificate Authority (CA) generation and signs Client Certificates.
    *   **Trust Verification**: Checks Nginx Headers (`X-Client-Verified`) and validates Time Drift.
3.  **Agent (PowerShell/Bash)**:
    *   Starts with an **Install Token**.
    *   Bootstraps via HTTPs to fetch its unique **Client Certificate**.
    *   Uses this Certificate for all future communication (Heartbeats, Tasks).

### 🔄 Data Flow: The "Bootstrap" Process
1.  **Admin** creates Agent -> Backend generates `Install Token`.
2.  **Admin** runs `install.ps1` on Target Machine.
3.  **Agent** downloads script from Nginx (`/static/`).
4.  **Agent** calls `POST /bootstrap` with `Token`.
5.  **Backend** validates Token -> Issues `client.crt` + `client.key`.
6.  **Agent** saves Certs locally.
7.  **Agent** switches to **mTLS Mode**.
8.  **Agent** calls `POST /heartbeat` proving its identity.
9.  **Nginx** validates Cert -> Forwards to Backend -> Status becomes **Active**.

### Terminal 2: Frontend
```bash
cd security-intelligence-platform
npm run dev
```
> The frontend will start on `http://localhost:3000` and automatically proxy requests to the backend.

-   **Frontend**: `http://localhost:3000`
-   **Backend**: `http://localhost:5000`
-   **API Docs**: `http://localhost:5000/apidocs`
-   **Database**: `localhost:5432` (User: `admin`, Pass: as set in `.env`, DB: `security_platform`)

### Environment Configuration

The backend auto-detects the database mode. To switch to Cloud Supabase, edit `security-intelligence-platform-backend/config.py` or set the env var:
-   `USE_LOCAL_DB=False`

## 🧠 Advanced Features

### Pro Agent Management
The platform includes an enterprise-grade **Agent Creation Wizard**:
-   **Multi-Platform Support**: Endpoint, Network Sensor, Cloud VM, Kubernetes.
-   **Trust Configuration**: Enforce mTLS, Hardware Binding, and Auto-Revocation policies.
-   **Secure Enrollment**: Generates single-use, time-limited install commands for Linux and Windows.

### Database Architecture
The backend uses a custom adapter pattern to seamlessly switch between local PostgreSQL and remote Supabase without changing business logic.
-   **Local Mode**: Uses `psycopg2` to talk to Dockerized Postgres.
-   **Cloud Mode**: Uses `supabase-py` HTTP client.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Commit your changes.
4.  Push to video branch.
5.  Open a Pull Request.
