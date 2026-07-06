from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from .reranker import Reranker
from .models import RerankRequest, RerankResponse, RerankResult

reranker = Reranker()


@asynccontextmanager
async def lifespan(app: FastAPI):
    reranker.load_model()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest):
    try:
        # Преобразуем Pydantic модели в словари
        documents = [doc.model_dump() for doc in request.documents]

        results = reranker.rerank(
            query=request.query,
            documents=documents,
            top_k=request.top_k
        )

        # Преобразуем результаты в Pydantic модели
        rerank_results = [RerankResult(**r) for r in results]

        return RerankResponse(results=rerank_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": reranker.model is not None,
        "model_name": reranker.model_name,
    }
