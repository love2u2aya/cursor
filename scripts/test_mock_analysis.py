"""Integration test with mock data (no API credentials required)."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.analytics_api import AnalyticsData, PeriodMetrics, TrafficSourceMetrics, VideoAnalytics
from src.analyzer import analyze_channel
from src.data_api import ChannelInfo, VideoInfo
from src.report import generate_report, save_report


def make_mock_data() -> tuple[ChannelInfo, list[VideoInfo], AnalyticsData]:
    channel = ChannelInfo(
        channel_id="UC_test123",
        title="テストチャンネル",
        subscriber_count=10000,
        view_count=500000,
        video_count=50,
        uploads_playlist_id="UU_test123",
    )

    now = datetime.now(timezone.utc)
    videos = [
        VideoInfo(
            video_id=f"vid_{i}",
            title=f"テスト動画 {i}: {'人気コンテンツ' if i <= 3 else '通常動画'}",
            published_at=now - timedelta(days=i * 14),
            duration_seconds=600 if i <= 5 else 300,
            view_count=50000 - i * 3000,
            like_count=2000 - i * 100,
            comment_count=200 - i * 10,
        )
        for i in range(1, 11)
    ]

    analytics = AnalyticsData(
        current_period=PeriodMetrics(
            views=25000,
            estimated_minutes_watched=45000,
            average_view_duration=180,
            subscribers_gained=500,
            subscribers_lost=50,
        ),
        previous_period=PeriodMetrics(
            views=20000,
            estimated_minutes_watched=38000,
            average_view_duration=170,
            subscribers_gained=400,
            subscribers_lost=60,
        ),
        video_metrics={
            v.video_id: VideoAnalytics(
                video_id=v.video_id,
                views=v.view_count // 2,
                estimated_minutes_watched=v.view_count * 0.5,
                average_view_duration=90 if v.video_id == "vid_8" else 200,
                subscribers_gained=10 if v.video_id != "vid_9" else 0,
            )
            for v in videos
        },
        traffic_sources=[
            TrafficSourceMetrics("YT_SEARCH", views=8000, estimated_minutes_watched=12000),
            TrafficSourceMetrics("RELATED_VIDEO", views=5000, estimated_minutes_watched=8000),
            TrafficSourceMetrics("SUBSCRIBER", views=3000, estimated_minutes_watched=5000),
        ],
        daily_views=[(f"2026-07-{d:02d}", 800 + d * 10) for d in range(1, 8)],
    )

    return channel, videos, analytics


def main() -> int:
    channel, videos, analytics = make_mock_data()
    result = analyze_channel(channel, videos, analytics, period_days=90)

    assert result.channel.title == "テストチャンネル"
    assert len(result.achievements) >= 1
    assert len(result.video_rows) == 10
    assert len(result.action_items) >= 1

    report = generate_report(result)
    assert "# YouTube チャンネル分析レポート" in report
    assert "エグゼクティブサマリー" in report
    assert "改善候補" in report

    output_path = save_report(result, PROJECT_ROOT / "reports")
    assert output_path.exists()
    print(f"Mock report generated: {output_path}")
    print(f"Achievements: {len(result.achievements)}")
    print(f"Improvements: {len(result.improvements)}")
    print(f"Action items: {len(result.action_items)}")
    print("All mock tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
