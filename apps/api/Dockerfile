FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY apps/api /app
COPY data /app/data

ENV PYTHONPATH=/app
ENV KNOWLEDGE_DIR=/app/data/knowledge
ENV CHROMA_PERSIST_DIR=/app/data/chroma

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
