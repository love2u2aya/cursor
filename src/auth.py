"""OAuth2 authentication for YouTube APIs."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CLIENT_SECRETS = PROJECT_ROOT / "client_secret.json"
DEFAULT_TOKEN_FILE = PROJECT_ROOT / "token.json"


def _resolve_path(env_key: str, default: Path) -> Path:
    value = os.getenv(env_key)
    if value:
        path = Path(value)
        return path if path.is_absolute() else PROJECT_ROOT / path
    return default


def get_client_secrets_path() -> Path:
    return _resolve_path("CLIENT_SECRETS_FILE", DEFAULT_CLIENT_SECRETS)


def get_token_path() -> Path:
    return _resolve_path("TOKEN_FILE", DEFAULT_TOKEN_FILE)


def get_credentials(force_reauth: bool = False) -> Credentials:
    """Load or refresh OAuth credentials."""
    token_path = get_token_path()
    client_secrets = get_client_secrets_path()
    creds: Credentials | None = None

    if not force_reauth and token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json(), encoding="utf-8")
        return creds

    if not client_secrets.exists():
        raise FileNotFoundError(
            f"OAuth client secrets not found at {client_secrets}. "
            "Download from Google Cloud Console and save as client_secret.json."
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secrets), SCOPES)
    creds = flow.run_local_server(port=0)
    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def build_youtube_service(creds: Credentials | None = None):
    """Build YouTube Data API v3 service."""
    creds = creds or get_credentials()
    return build("youtube", "v3", credentials=creds)


def build_analytics_service(creds: Credentials | None = None):
    """Build YouTube Analytics API service."""
    creds = creds or get_credentials()
    return build("youtubeAnalytics", "v2", credentials=creds)


def run_auth_flow() -> None:
    """Run interactive OAuth flow and save token."""
    creds = get_credentials(force_reauth=True)
    print(f"Authentication successful. Token saved to {get_token_path()}")
    print(f"Token expiry: {creds.expiry}")
