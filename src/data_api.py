"""YouTube Data API v3 client."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from googleapiclient.discovery import Resource


@dataclass
class ChannelInfo:
    channel_id: str
    title: str
    subscriber_count: int
    view_count: int
    video_count: int
    uploads_playlist_id: str


@dataclass
class VideoInfo:
    video_id: str
    title: str
    published_at: datetime
    duration_seconds: int
    view_count: int
    like_count: int
    comment_count: int

    @property
    def engagement_rate(self) -> float:
        if self.view_count == 0:
            return 0.0
        return (self.like_count + self.comment_count) / self.view_count

    @property
    def like_rate(self) -> float:
        if self.view_count == 0:
            return 0.0
        return self.like_count / self.view_count


def _parse_iso8601_duration(duration: str) -> int:
    """Parse ISO 8601 duration (e.g. PT1H2M3S) to seconds."""
    import re

    if not duration or duration == "P0D":
        return 0

    pattern = re.compile(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
    )
    match = pattern.match(duration)
    if not match:
        return 0

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def get_channel_info(youtube: Resource) -> ChannelInfo:
    """Fetch authenticated user's channel information."""
    response = (
        youtube.channels()
        .list(part="snippet,statistics,contentDetails", mine=True)
        .execute()
    )

    items = response.get("items", [])
    if not items:
        raise ValueError("No channel found for authenticated user.")

    item = items[0]
    stats = item.get("statistics", {})
    snippet = item.get("snippet", {})
    content = item.get("contentDetails", {}).get("relatedPlaylists", {})

    return ChannelInfo(
        channel_id=item["id"],
        title=snippet.get("title", "Unknown"),
        subscriber_count=int(stats.get("subscriberCount", 0)),
        view_count=int(stats.get("viewCount", 0)),
        video_count=int(stats.get("videoCount", 0)),
        uploads_playlist_id=content.get("uploads", ""),
    )


def get_uploaded_videos(
    youtube: Resource,
    uploads_playlist_id: str,
    max_videos: int = 50,
) -> list[str]:
    """Get video IDs from uploads playlist."""
    video_ids: list[str] = []
    next_page_token: str | None = None

    while len(video_ids) < max_videos:
        page_size = min(50, max_videos - len(video_ids))
        request: dict[str, Any] = {
            "part": "contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": page_size,
        }
        if next_page_token:
            request["pageToken"] = next_page_token

        response = youtube.playlistItems().list(**request).execute()

        for item in response.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId")
            if video_id:
                video_ids.append(video_id)

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return video_ids[:max_videos]


def get_video_details(youtube: Resource, video_ids: list[str]) -> list[VideoInfo]:
    """Fetch detailed information for a list of videos."""
    if not video_ids:
        return []

    videos: list[VideoInfo] = []

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        response = (
            youtube.videos()
            .list(part="snippet,contentDetails,statistics", id=",".join(batch))
            .execute()
        )

        for item in response.get("items", []):
            stats = item.get("statistics", {})
            snippet = item.get("snippet", {})
            content = item.get("contentDetails", {})

            published_raw = snippet.get("publishedAt", "")
            published_at = datetime.fromisoformat(
                published_raw.replace("Z", "+00:00")
            )

            videos.append(
                VideoInfo(
                    video_id=item["id"],
                    title=snippet.get("title", "Untitled"),
                    published_at=published_at,
                    duration_seconds=_parse_iso8601_duration(
                        content.get("duration", "")
                    ),
                    view_count=int(stats.get("viewCount", 0)),
                    like_count=int(stats.get("likeCount", 0)),
                    comment_count=int(stats.get("commentCount", 0)),
                )
            )

    videos.sort(key=lambda v: v.published_at, reverse=True)
    return videos
