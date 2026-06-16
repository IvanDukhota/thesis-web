FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prevent Python from writing pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Force CPU usage (RTX 5070 sm_120 not supported by PyTorch)
ENV CUDA_VISIBLE_DEVICES=-1

# Copy requirements
COPY requirements.txt /app/

# Install Python dependencies with increased timeout
RUN pip install --no-cache-dir --timeout=1000 \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.0+cpu && \
    pip install --no-cache-dir --timeout=1000 -r requirements.txt

# Copy application code
COPY . /app/

# Expose port
EXPOSE 8001

# Start FastAPI with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
