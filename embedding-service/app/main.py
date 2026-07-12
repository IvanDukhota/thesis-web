from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from .embedder import Embedder
from .models import EmbedRequest, EmbedResponse

embedder = Embedder()


@asynccontextmanager
async def lifespan(app: FastAPI):
    embedder.load_model()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    try:
        embedding = embedder.embed(request.text)
        return EmbedResponse(embedding=embedding, dimensions=len(embedding))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": embedder.model is not None,
        "model_name": embedder.model_name,
    }
