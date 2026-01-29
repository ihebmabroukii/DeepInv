# Build Stage
FROM python:3.12-slim as builder

WORKDIR /tmp
RUN pip install poetry
COPY ./requirements.txt /tmp/requirements.txt
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /tmp/wheels -r requirements.txt

# Final Stage
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy wheels and install
COPY --from=builder /tmp/wheels /tmp/wheels
COPY --from=builder /tmp/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache /tmp/wheels/*

# Copy Application Code
COPY . /app

# Create non-root user for security
RUN useradd -m socuser
USER socuser

# Expose port
EXPOSE 8000

# Run Application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
