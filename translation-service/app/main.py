from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from .translator import NLLBTranslator
from .models import TranslateRequest, TranslateResponse, BatchTranslateRequest, BatchTranslateResponse

translator = NLLBTranslator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    translator.load_model()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    try:
        print(f"Translation request: {request.text[:50]}... from {request.source_language} to {request.target_language}")
        translated_text = translator.translate(
            text=request.text,
            src_lang=request.source_language,
            tgt_lang=request.target_language
        )
        print(f"Translation successful: {translated_text[:50]}...")
        return TranslateResponse(
            translated_text=translated_text,
            source_language=request.source_language,
            target_language=request.target_language
        )
    except Exception as e:
        print(f"Translation error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/translate/batch", response_model=BatchTranslateResponse)
async def translate_batch(batch_request: BatchTranslateRequest):
    results = []
    for req in batch_request.requests:
        try:
            translated = translator.translate(
                req.text,
                req.source_language,
                req.target_language
            )
            results.append({
                "success": True,
                "translated_text": translated
            })
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e)
            })
    return BatchTranslateResponse(results=results)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": translator.model is not None,
        "device": str(translator.device)
    }
