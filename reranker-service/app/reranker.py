from sentence_transformers import CrossEncoder
import numpy as np


class Reranker:
    def __init__(self, model_name: str = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"):
        self.model_name = model_name
        self.model: CrossEncoder | None = None

    def load_model(self) -> None:
        print(f"Loading {self.model_name}...")
        self.model = CrossEncoder(self.model_name, max_length=512)
        print(f"Reranker model loaded successfully")

    def rerank(self, query: str, documents: list[dict], top_k: int = 30) -> list[dict]:
        if not self.model:
            raise RuntimeError("Model not loaded")

        doc_texts = []
        for doc in documents:
            tags_str = ", ".join(doc["tags"]) if doc["tags"] else ""
            doc_text = f"{doc['category']} | {tags_str} | {doc['title']} | {doc['description']}"
            doc_texts.append(doc_text)

        pairs = [[query, doc_text] for doc_text in doc_texts]

        scores = self.model.predict(pairs)

        normalized_scores = 1 / (1 + np.exp(-scores))

        results = []
        for idx, (doc, score, norm_score) in enumerate(zip(documents, scores, normalized_scores)):
            results.append({
                "id": doc["id"],
                "score": float(score),
                "relevance_score": float(norm_score)
            })
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:top_k]
