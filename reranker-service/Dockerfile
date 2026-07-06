FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=-1

COPY requirements.txt /app/

RUN pip install --no-cache-dir --timeout=1000 \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.0+cpu && \
    pip install --no-cache-dir --timeout=1000 -r requirements.txt

COPY . /app/

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
