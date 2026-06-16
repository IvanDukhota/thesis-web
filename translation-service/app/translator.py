from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import os


class NLLBTranslator:
    def __init__(self, model_name="facebook/nllb-200-1.3B"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cpu")

    def load_model(self):
        print(f"Loading {self.model_name} on CPU...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True
        )
        self.model.to(self.device)
        self.model.eval()
        print(f"Model loaded successfully on {self.device}")

    def translate(self, text: str, src_lang: str, tgt_lang: str) -> str:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model not loaded")

        self.tokenizer.src_lang = src_lang

        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=1024)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            translated_tokens = self.model.generate(
                **inputs,
                forced_bos_token_id=self.tokenizer.lang_code_to_id[tgt_lang],
                max_length=1024,
                num_beams=5,
                early_stopping=True,
                no_repeat_ngram_size=3 
            )

        return self.tokenizer.batch_decode(
            translated_tokens,
            skip_special_tokens=True
        )[0]
