# Translation Service

FastAPI-based translation service using NLLB-200 distilled model.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Endpoints

- `POST /translate` - Translate single text
- `POST /translate/batch` - Translate multiple texts (more efficient)
- `GET /health` - Health check

## Note

First run will download the NLLB-200 model (~1.2GB). This may take some time.
