# Security Intelligence Platform

A comprehensive security intelligence dashboard and management platform featuring a modern Next.js frontend and a robust Flask backend.

## 🚀 Overview

The Security Intelligence Platform is designed to provide real-time insights and management capabilities for security operations. It consists of two main components:

-   **Frontend**: A responsive and interactive dashboard built with Next.js, featuring data visualization and a modern UI component library.
-   **Backend**: A RESTful API service built with Flask, ensuring secure data handling and integration with Supabase.

## 🛠️ Technology Stack

### Frontend (`/security-intelligence-platform`)
-   **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/) (Icons)
-   **Data Visualization**: [Recharts](https://recharts.org/)
-   **State Management & API**: [TanStack Query](https://tanstack.com/query) & [Orval](https://orval.dev/)
-   **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Backend (`/security-intelligence-platform-backend`)
-   **Framework**: [Flask](https://flask.palletsprojects.com/)
-   **Database**: [Supabase](https://supabase.com/)
-   **API Documentation**: [Flasgger](https://github.com/flasgger/flasgger) (Swagger UI)
-   **Authentication**: Middleware-based (likely Supabase Auth integration)

## 📋 Prerequisites

Ensure you have the following installed on your machine:
-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   [Python](https://www.python.org/) (3.8+ recommended)
-   [pip](https://pip.pypa.io/) (Python package manager)

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd DeepInv
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    cd security-intelligence-platform
    npm install
    ```

3.  **Install Backend Dependencies**:
    Navigate to the backend directory and install the required Python packages.
    ```bash
    cd ../security-intelligence-platform-backend
    pip install -r requirements.txt
    ```

4.  **Environment Configuration**:
    -   Ensure you have a `.env` file in `security-intelligence-platform-backend` with necessary configuration (e.g., Supabase credentials).
    -   Check if the frontend requires local environment variables.

## 🏃‍♂️ Running the Project

You can run both the frontend and backend servers simultaneously from the root directory using the simplified command:

```bash
# From the root directory (DeepInv)
npm run dev
```

This command uses `concurrently` to start:
-   **Frontend**: `localhost:3000`
-   **Backend**: `localhost:5000` (or configured port)

### Running Separately

If you prefer to run them in separate terminals:

**Frontend:**
```bash
cd security-intelligence-platform
npm run dev
```

**Backend:**
```bash
cd security-intelligence-platform-backend
python run.py
```

## 📂 Project Structure

```
DeepInv/
├── security-intelligence-platform/        # Next.js Frontend
│   ├── app/                               # App Router pages and layouts
│   ├── components/                        # Reusable React components
│   ├── public/                            # Static assets
│   └── package.json                       # Frontend dependencies
│
├── security-intelligence-platform-backend/ # Flask Backend
│   ├── app/                               # Application logic (routes, models)
│   ├── run.py                             # Entry point
│   ├── requirements.txt                   # Backend dependencies
│   └── swagger.json                       # API definition
│
└── package.json                           # Root scripts for concurrent execution
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

[Add License Information Here]
