from pydantic import BaseModel


class OrderDocument(BaseModel):
    id: str
    category: str
    tags: list[str]
    title: str
    description: str


class RerankRequest(BaseModel):
    query: str
    documents: list[OrderDocument]
    top_k: int = 30


class RerankResult(BaseModel):
    id: str
    score: float
    relevance_score: float


class RerankResponse(BaseModel):
    results: list[RerankResult]
