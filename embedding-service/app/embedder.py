from sentence_transformers import SentenceTransformer
import numpy as np


class Embedder:
    def __init__(self, model_name: str = "intfloat/multilingual-e5-base"):
        self.model_name = model_name
        self.model: SentenceTransformer | None = None

    def load_model(self) -> None:
        print(f"Loading {self.model_name}...")
        self.model = SentenceTransformer(self.model_name)
        print(f"Embedding model loaded successfully on {self.model.device}")

    def embed(self, text: str) -> list[float]:
        if not self.model:
            raise RuntimeError("Model not loaded")
        vector = self.model.encode(text, convert_to_numpy=True)
        vector = vector / np.linalg.norm(vector)
        return vector.tolist()
