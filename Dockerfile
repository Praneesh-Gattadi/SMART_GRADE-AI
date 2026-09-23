FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files
COPY . .

# Expose FastAPI port
EXPOSE 8000

# By default, run Uvicorn. Celery workers will override this.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
