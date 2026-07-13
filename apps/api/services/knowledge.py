from __future__ import annotations

import hashlib
import re
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings


class KnowledgeService:
    def __init__(self) -> None:
        settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(settings.chroma_persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="knowledge",
            metadata={"hnsw:space": "cosine"},
        )
        self._indexed = False

    def ensure_indexed(self) -> None:
        if self._indexed and self._collection.count() > 0:
            return
        self._indexed = True
        if self._collection.count() > 0:
            return

        knowledge_dir = settings.knowledge_dir
        if not knowledge_dir.exists():
            return

        documents: list[str] = []
        metadatas: list[dict[str, str]] = []
        ids: list[str] = []

        for path in sorted(knowledge_dir.glob("**/*")):
            if path.suffix.lower() not in {".md", ".txt", ".json"}:
                continue
            text = path.read_text(encoding="utf-8")
            for idx, chunk in enumerate(_chunk_text(text)):
                chunk_id = hashlib.md5(f"{path}:{idx}".encode()).hexdigest()
                documents.append(chunk)
                metadatas.append({"source": str(path.relative_to(knowledge_dir)), "chunk": str(idx)})
                ids.append(chunk_id)

        if documents:
            self._collection.add(documents=documents, metadatas=metadatas, ids=ids)

    def search(self, query: str, limit: int = 3) -> list[dict[str, str | float]]:
        self.ensure_indexed()
        if self._collection.count() == 0 or not query.strip():
            return []

        result = self._collection.query(
            query_texts=[query],
            n_results=min(limit, self._collection.count()),
        )
        docs = result.get("documents", [[]])[0]
        metas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        hits: list[dict[str, str | float]] = []
        for doc, meta, dist in zip(docs, metas, distances):
            relevance = max(0.0, 1.0 - float(dist))
            hits.append(
                {
                    "body": doc,
                    "source": meta.get("source", "unknown"),
                    "relevance_score": relevance,
                }
            )
        return hits

    def keyword_search(self, terms: list[str], limit: int = 3) -> list[dict[str, str | float]]:
        query = " ".join(terms) if terms else ""
        return self.search(query, limit)


def _chunk_text(text: str, max_chars: int = 500) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            if len(para) <= max_chars:
                current = para
            else:
                for i in range(0, len(para), max_chars):
                    chunks.append(para[i : i + max_chars])
                current = ""
    if current:
        chunks.append(current)
    return chunks
