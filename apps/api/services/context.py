from __future__ import annotations

import asyncio
import json
from typing import Any
from uuid import uuid4

from config import settings
from models.schemas import ContextCard
from models.session import Session
from services.knowledge import KnowledgeService


class ContextService:
    def __init__(self, knowledge: KnowledgeService) -> None:
        self._knowledge = knowledge
        self._client = None
        if settings.openai_api_key:
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.openai_api_key)

    async def extract_context(self, session: Session) -> dict[str, Any]:
        transcript = session.recent_transcript_text(minutes=3)
        if not transcript.strip():
            return {"cards": [], "summary": "", "decisions": [], "open_questions": []}

        analysis = await asyncio.to_thread(self._analyze_transcript, transcript)
        cards = self._build_cards(analysis, transcript)
        new_cards = session.add_cards(cards)

        return {
            "cards": [card.model_dump() for card in new_cards],
            "summary": analysis.get("summary", ""),
            "decisions": analysis.get("decisions", []),
            "open_questions": analysis.get("open_questions", []),
        }

    def _analyze_transcript(self, transcript: str) -> dict[str, Any]:
        if self._client is None:
            return self._demo_analysis(transcript)

        prompt = (
            "以下は会議の直近トランスクリプトです。JSONのみで回答してください。\n"
            "形式: {\"topics\":[],\"questions\":[],\"entities\":[],\"search_queries\":[],"
            "\"summary\":\"\",\"decisions\":[],\"open_questions\":[],\"action_items\":[]}\n\n"
            f"トランスクリプト:\n{transcript}"
        )
        response = self._client.chat.completions.create(
            model=settings.context_model,
            messages=[
                {"role": "system", "content": "会議内容を構造化するアシスタントです。日本語で回答します。"},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)

    def _demo_analysis(self, transcript: str) -> dict[str, Any]:
        queries = []
        for keyword in ["料金", "導入", "サポート", "契約", "機能"]:
            if keyword in transcript:
                queries.append(keyword)

        return {
            "topics": queries or ["会議内容"],
            "questions": [],
            "entities": [],
            "search_queries": queries or [transcript[:80]],
            "summary": transcript[:200] + ("..." if len(transcript) > 200 else ""),
            "decisions": [],
            "open_questions": [],
            "action_items": [],
        }

    def _build_cards(self, analysis: dict[str, Any], transcript: str) -> list[ContextCard]:
        cards: list[ContextCard] = []
        seen_sources: set[str] = set()

        search_queries = analysis.get("search_queries") or analysis.get("topics") or []
        if isinstance(search_queries, str):
            search_queries = [search_queries]

        for query in search_queries[:3]:
            hits = self._knowledge.search(str(query), limit=+2)
            for hit in hits:
                source = str(hit["source"])
                if source in seen_sources:
                    continue
                seen_sources.add(source)
                cards.append(
                    ContextCard(
                        id=str(uuid4()),
                        type="knowledge",
                        title=f"関連情報: {source}",
                        body=str(hit["body"])[:400],
                        sources=[source],
                        relevance_score=float(hit["relevance_score"]),
                    )
                )

        summary = analysis.get("summary", "")
        if summary:
            cards.append(
                ContextCard(
                    id=str(uuid4()),
                    type="summary",
                    title="会話の要約",
                    body=summary,
                    sources=[],
                    relevance_score=0.8,
                )
            )

        for item in analysis.get("action_items", [])[:3]:
            cards.append(
                ContextCard(
                    id=str(uuid4()),
                    type="action",
                    title="アクションアイテム",
                    body=str(item),
                    sources=[],
                    relevance_score=0.7,
                )
            )

        if not cards and transcript.strip():
            cards.append(
                ContextCard(
                    id=str(uuid4()),
                    type="summary",
                    title="直近の発言",
                    body=transcript[-300:],
                    sources=[],
                    relevance_score=0.5,
                )
            )

        return cards
