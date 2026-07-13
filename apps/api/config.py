from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    chunk_duration_seconds: int = 30
    transcription_model: str = "whisper-1"
    context_model: str = "gpt-4o-mini"
    knowledge_dir: Path = WORKSPACE_ROOT / "data" / "knowledge"
    chroma_persist_dir: Path = WORKSPACE_ROOT / "data" / "chroma"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
