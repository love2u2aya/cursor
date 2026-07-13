"""YouTube Analytics API client."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from googleapiclient.discovery import Resource


@dataclass
class PeriodMetrics:
    views: int = 0
    estimated_minutes_watched: float = 0.0
    average_view_duration: float = 0.0
    subscribers_gained: int = 0
    subscribers_lost: int = 0

    @property
    def net_subscribers(self) -> int:
        return self.subscribers_gained - self.subscribers_lost


@dataclass
class VideoAnalytics:
    video_id: str
    views: int = 0
    estimated_minutes_watched: float = 0.0
    average_view_duration: float = 0.0
    subscribers_gained: int = 0


@dataclass
class TrafficSourceMetrics:
    source_type: str
    views: int = 0
    estimated_minutes_watched: float = 0.0


@dataclass
class AnalyticsData:
    current_period: PeriodMetrics = field(default_factory=PeriodMetrics)
    previous_period: PeriodMetrics = field(default_factory=PeriodMetrics)
    video_metrics: dict[str, VideoAnalytics] = field(default_factory=dict)
    traffic_sources: list[TrafficSourceMetrics] = field(default_factory=list)
    daily_views: list[tuple[str, int]] = field(default_factory=list)


def _date_range(days: int, offset_days: int = 0) -> tuple[str, str]:
    """Return (start_date, end_date) as YYYY-MM-DD strings."""
    end = date.today() - timedelta(days=offset_days)
    start = end - timedelta(days=days - 1)
    return start.isoformat(), end.isoformat()


def _parse_period_report(response: dict[str, Any]) -> PeriodMetrics:
    """Parse a channel-level analytics report."""
    metrics = PeriodMetrics()
    rows = response.get("rows", [])
    if not rows:
        return metrics

    headers = [h["name"] for h in response.get("columnHeaders", [])]
    row = rows[0]
    data = dict(zip(headers, row))

    metrics.views = int(data.get("views", 0))
    metrics.estimated_minutes_watched = float(
        data.get("estimatedMinutesWatched", 0)
    )
    metrics.average_view_duration = float(data.get("averageViewDuration", 0))
    metrics.subscribers_gained = int(data.get("subscribersGained", 0))
    metrics.subscribers_lost = int(data.get("subscribersLost", 0))
    return metrics


def get_channel_period_metrics(
    analytics: Resource,
    days: int,
    offset_days: int = 0,
) -> PeriodMetrics:
    """Fetch aggregated channel metrics for a date range."""
    start_date, end_date = _date_range(days, offset_days)

    response = (
        analytics.reports()
        .query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            metrics=(
                "views,estimatedMinutesWatched,averageViewDuration,"
                "subscribersGained,subscribersLost"
            ),
        )
        .execute()
    )
    return _parse_period_report(response)


def get_video_analytics(
    analytics: Resource,
    video_ids: list[str],
    days: int,
) -> dict[str, VideoAnalytics]:
    """Fetch per-video analytics for the given period."""
    if not video_ids:
        return {}

    start_date, end_date = _date_range(days)
    result: dict[str, VideoAnalytics] = {}

    # Analytics API filters support up to 200 video IDs
    for i in range(0, len(video_ids), 200):
        batch = video_ids[i : i + 200]
        filters = "video==" + ",".join(batch)

        try:
            response = (
                analytics.reports()
                .query(
                    ids="channel==MINE",
                    startDate=start_date,
                    endDate=end_date,
                    dimensions="video",
                    metrics=(
                        "views,estimatedMinutesWatched,averageViewDuration,"
                        "subscribersGained"
                    ),
                    filters=filters,
                    maxResults=200,
                )
                .execute()
            )
        except Exception:
            # Fallback: query without filter if batch fails
            response = (
                analytics.reports()
                .query(
                    ids="channel==MINE",
                    startDate=start_date,
                    endDate=end_date,
                    dimensions="video",
                    metrics=(
                        "views,estimatedMinutesWatched,averageViewDuration,"
                        "subscribersGained"
                    ),
                    maxResults=200,
                    sort="-views",
                )
                .execute()
            )

        headers = [h["name"] for h in response.get("columnHeaders", [])]
        for row in response.get("rows", []):
            data = dict(zip(headers, row))
            vid = data.get("video", "")
            if vid:
                result[vid] = VideoAnalytics(
                    video_id=vid,
                    views=int(data.get("views", 0)),
                    estimated_minutes_watched=float(
                        data.get("estimatedMinutesWatched", 0)
                    ),
                    average_view_duration=float(
                        data.get("averageViewDuration", 0)
                    ),
                    subscribers_gained=int(data.get("subscribersGained", 0)),
                )

    return result


def get_traffic_sources(
    analytics: Resource,
    days: int,
) -> list[TrafficSourceMetrics]:
    """Fetch traffic source breakdown."""
    start_date, end_date = _date_range(days)
    sources: list[TrafficSourceMetrics] = []

    try:
        response = (
            analytics.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                dimensions="insightTrafficSourceType",
                metrics="views,estimatedMinutesWatched",
                sort="-views",
                maxResults=25,
            )
            .execute()
        )

        headers = [h["name"] for h in response.get("columnHeaders", [])]
        for row in response.get("rows", []):
            data = dict(zip(headers, row))
            sources.append(
                TrafficSourceMetrics(
                    source_type=data.get("insightTrafficSourceType", "UNKNOWN"),
                    views=int(data.get("views", 0)),
                    estimated_minutes_watched=float(
                        data.get("estimatedMinutesWatched", 0)
                    ),
                )
            )
    except Exception:
        pass

    return sources


def get_daily_views(
    analytics: Resource,
    days: int,
) -> list[tuple[str, int]]:
    """Fetch daily view counts."""
    start_date, end_date = _date_range(days)
    daily: list[tuple[str, int]] = []

    try:
        response = (
            analytics.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                dimensions="day",
                metrics="views",
                sort="day",
                maxResults=days,
            )
            .execute()
        )

        headers = [h["name"] for h in response.get("columnHeaders", [])]
        for row in response.get("rows", []):
            data = dict(zip(headers, row))
            day = data.get("day", "")
            views = int(data.get("views", 0))
            if day:
                daily.append((day, views))
    except Exception:
        pass

    return daily


def fetch_all_analytics(
    analytics: Resource,
    video_ids: list[str],
    days: int,
) -> AnalyticsData:
    """Fetch all analytics data for analysis."""
    data = AnalyticsData()

    data.current_period = get_channel_period_metrics(analytics, days)
    data.previous_period = get_channel_period_metrics(
        analytics, days, offset_days=days
    )
    data.video_metrics = get_video_analytics(analytics, video_ids, days)
    data.traffic_sources = get_traffic_sources(analytics, days)
    data.daily_views = get_daily_views(analytics, days)

    return data
