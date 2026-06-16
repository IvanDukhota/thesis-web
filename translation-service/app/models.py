from pydantic import BaseModel


class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str


class TranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str


class BatchTranslateRequest(BaseModel):
    requests: list[TranslateRequest]


class BatchTranslateResponse(BaseModel):
    results: list[dict]
