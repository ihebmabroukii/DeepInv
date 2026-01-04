
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for psycopg2 and others
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variables
ENV FLASK_APP=run.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose port (Internal only, strictly)
EXPOSE 5000

# Run with Gunicorn for production readiness
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app", "--log-level", "debug"]
