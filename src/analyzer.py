"""Channel analysis and improvement detection rules."""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal

from src.analytics_api import AnalyticsData, TrafficSourceMetrics
from src.data_api import ChannelInfo, VideoInfo

Priority = Literal["high", "medium", "low"]

TRAFFIC_SOURCE_LABELS = {
    "YT_SEARCH": "YouTube検索",
    "RELATED_VIDEO": "関連動画",
    "EXT_URL": "外部URL",
    "YT_CHANNEL": "チャンネルページ",
    "YT_OTHER_PAGE": "その他YouTubeページ",
    "SUBSCRIBER": "登録者フィード",
    "NOTIFICATION": "通知",
    "PLAYLIST": "プレイリスト",
    "NO_LINK_OTHER": "直接入力・不明",
    "END_SCREEN": "終了画面",
    "ANNOTATION": "アノテーション",
    "CAMPAIGN_CARD": "カード",
    "SHORTS": "ショート",
    "SOUND_PAGE": "サウンドページ",
    "HASHTAGS": "ハッシュタグ",
    "LIVE_REDIRECT": "ライブリダイレクト",
    "PRODUCT_PAGE": "商品ページ",
    "BROWSE": "ブラウジング機能",
    "ADVERTISING": "広告",
}


@dataclass
class GrowthMetrics:
    views_change_pct: float | None = None
    watch_time_change_pct: float | None = None
    subscribers_net_change: int = 0
    subscribers_change_pct: float | None = None


@dataclass
class Achievement:
    category: str
    title: str
    description: str


@dataclass
class Improvement:
    priority: Priority
    category: str
    title: str
    description: str
    affected_items: list[str] = field(default_factory=list)


@dataclass
class VideoAnalysisRow:
    video_id: str
    title: str
    published_at: datetime
    duration_seconds: int
    view_count: int
    like_count: int
    comment_count: int
    engagement_rate: float
    like_rate: float
    avg_view_duration: float | None = None
    retention_rate: float | None = None
    period_views: int | None = None
    subscribers_gained: int | None = None


@dataclass
class AnalysisResult:
    channel: ChannelInfo
    period_days: int
    analyzed_at: datetime
    growth: GrowthMetrics
    achievements: list[Achievement]
    improvements: list[Improvement]
    action_items: list[str]
    video_rows: list[VideoAnalysisRow]
    traffic_sources: list[TrafficSourceMetrics]
    total_period_views: int
    total_period_watch_minutes: float
    avg_view_duration: float
    videos_in_period: int
    avg_upload_interval_days: float | None


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return ((current - previous) / previous) * 100


def _median(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * pct / 100)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


def _format_traffic_source(source: str) -> str:
    return TRAFFIC_SOURCE_LABELS.get(source, source)


def compute_growth(analytics: AnalyticsData) -> GrowthMetrics:
    cur = analytics.current_period
    prev = analytics.previous_period

    growth = GrowthMetrics(
        subscribers_net_change=cur.net_subscribers,
    )
    growth.views_change_pct = _pct_change(cur.views, prev.views)
    growth.watch_time_change_pct = _pct_change(
        cur.estimated_minutes_watched, prev.estimated_minutes_watched
    )
    growth.subscribers_change_pct = _pct_change(
        cur.net_subscribers, prev.net_subscribers
    )
    return growth


def build_video_rows(
    videos: list[VideoInfo],
    analytics: AnalyticsData,
) -> list[VideoAnalysisRow]:
    rows: list[VideoAnalysisRow] = []
    for video in videos:
        va = analytics.video_metrics.get(video.video_id)
        avg_dur = va.average_view_duration if va else None
        retention = None
        if avg_dur is not None and video.duration_seconds > 0:
            retention = avg_dur / video.duration_seconds

        rows.append(
            VideoAnalysisRow(
                video_id=video.video_id,
                title=video.title,
                published_at=video.published_at,
                duration_seconds=video.duration_seconds,
                view_count=video.view_count,
                like_count=video.like_count,
                comment_count=video.comment_count,
                engagement_rate=video.engagement_rate,
                like_rate=video.like_rate,
                avg_view_duration=avg_dur,
                retention_rate=retention,
                period_views=va.views if va else None,
                subscribers_gained=va.subscribers_gained if va else None,
            )
        )
    return rows


def detect_achievements(
    channel: ChannelInfo,
    growth: GrowthMetrics,
    video_rows: list[VideoAnalysisRow],
    analytics: AnalyticsData,
) -> list[Achievement]:
    achievements: list[Achievement] = []

    achievements.append(
        Achievement(
            category="チャンネル規模",
            title=f"登録者 {channel.subscriber_count:,} 人",
            description=f"総再生数 {channel.view_count:,} 回 / 動画 {channel.video_count} 本",
        )
    )

    if growth.views_change_pct is not None and growth.views_change_pct > 0:
        achievements.append(
            Achievement(
                category="成長",
                title=f"再生数が前期比 +{growth.views_change_pct:.1f}%",
                description=(
                    f"直近 {analytics.current_period.views:,} 回 "
                    f"(前期 {analytics.previous_period.views:,} 回)"
                ),
            )
        )

    if growth.watch_time_change_pct is not None and growth.watch_time_change_pct > 0:
        achievements.append(
            Achievement(
                category="成長",
                title=f"視聴時間が前期比 +{growth.watch_time_change_pct:.1f}%",
                description=(
                    f"{analytics.current_period.estimated_minutes_watched:,.0f} 分視聴 "
                    f"(前期 {analytics.previous_period.estimated_minutes_watched:,.0f} 分)"
                ),
            )
        )

    if growth.subscribers_net_change > 0:
        achievements.append(
            Achievement(
                category="登録者",
                title=f"純増登録者 +{growth.subscribers_net_change:,} 人",
                description=(
                    f"獲得 {analytics.current_period.subscribers_gained:,} / "
                    f"解除 {analytics.current_period.subscribers_lost:,}"
                ),
            )
        )

    if video_rows:
        top_by_views = max(video_rows, key=lambda r: r.view_count)
        achievements.append(
            Achievement(
                category="トップ動画",
                title=f"最多再生: {top_by_views.title[:50]}",
                description=f"{top_by_views.view_count:,} 回再生",
            )
        )

        engagement_candidates = [r for r in video_rows if r.view_count >= 100]
        if engagement_candidates:
            top_engagement = max(
                engagement_candidates, key=lambda r: r.engagement_rate
            )
            achievements.append(
                Achievement(
                    category="エンゲージメント",
                    title=f"最高エンゲージメント: {top_engagement.title[:50]}",
                    description=(
                        f"エンゲージメント率 {top_engagement.engagement_rate * 100:.2f}% "
                        f"(いいね率 {top_engagement.like_rate * 100:.2f}%)"
                    ),
                )
            )

        retention_candidates = [
            r for r in video_rows
            if r.retention_rate is not None and r.view_count >= 100
        ]
        if retention_candidates:
            top_retention = max(
                retention_candidates, key=lambda r: r.retention_rate or 0
            )
            achievements.append(
                Achievement(
                    category="視聴維持",
                    title=f"最高維持率: {top_retention.title[:50]}",
                    description=(
                        f"平均視聴維持率 {(top_retention.retention_rate or 0) * 100:.1f}%"
                    ),
                )
            )

    return achievements


def detect_improvements(
    video_rows: list[VideoAnalysisRow],
    analytics: AnalyticsData,
    period_days: int,
    avg_upload_interval: float | None,
) -> list[Improvement]:
    improvements: list[Improvement] = []

    # Retention issues
    low_retention = [
        r for r in video_rows
        if r.retention_rate is not None
        and r.duration_seconds > 60
        and r.retention_rate < 0.30
        and r.view_count >= 50
    ]
    if low_retention:
        improvements.append(
            Improvement(
                priority="high",
                category="視聴維持率",
                title="平均視聴時間が動画尺の30%未満の動画があります",
                description="冒頭のフックや構成を見直し、視聴者が離脱するポイントを特定してください。",
                affected_items=[r.title[:60] for r in low_retention[:5]],
            )
        )

    # Engagement issues
    like_rates = [r.like_rate for r in video_rows if r.view_count >= 100]
    if like_rates:
        median_like = _median(like_rates)
        low_engagement = [
            r for r in video_rows
            if r.view_count >= 100 and r.like_rate < median_like * 0.5
        ]
        if low_engagement:
            improvements.append(
                Improvement(
                    priority="medium",
                    category="エンゲージメント",
                    title="いいね率がチャンネル中央値の50%未満の動画があります",
                    description="CTA（いいね・コメント誘導）やコンテンツの共感ポイントを強化してください。",
                    affected_items=[r.title[:60] for r in low_engagement[:5]],
                )
            )

    # Upload frequency
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=30)
    recent_uploads = [
        r for r in video_rows if r.published_at >= recent_cutoff
    ]
    if not recent_uploads:
        improvements.append(
            Improvement(
                priority="high",
                category="投稿頻度",
                title="直近30日間の投稿がありません",
                description="定期投稿スケジュールを策定し、視聴者の習慣づけを図ってください。",
            )
        )
    elif avg_upload_interval is not None and avg_upload_interval > 60:
        improvements.append(
            Improvement(
                priority="medium",
                category="投稿頻度",
                title=f"平均投稿間隔が {avg_upload_interval:.0f} 日と長めです",
                description="週1本以上の投稿を目標に、コンテンツカレンダーを作成することを推奨します。",
            )
        )

    # Success pattern analysis
    if len(video_rows) >= 5:
        top_count = max(1, len(video_rows) // 5)
        sorted_by_views = sorted(video_rows, key=lambda r: r.view_count, reverse=True)
        top_videos = sorted_by_views[:top_count]

        durations = [v.duration_seconds for v in top_videos if v.duration_seconds > 0]
        if durations:
            avg_top_duration = statistics.mean(durations)
            if avg_top_duration < 300:
                duration_hint = "ショート〜5分未満"
            elif avg_top_duration < 900:
                duration_hint = "5〜15分"
            else:
                duration_hint = "15分以上"

            improvements.append(
                Improvement(
                    priority="low",
                    category="成功パターン",
                    title=f"上位動画の尺帯は「{duration_hint}」が多い傾向",
                    description="伸びている動画の尺・構成を横展開し、シリーズ化を検討してください。",
                    affected_items=[v.title[:60] for v in top_videos[:3]],
                )
            )

    # Traffic source concentration
    if analytics.traffic_sources:
        total_views = sum(s.views for s in analytics.traffic_sources)
        if total_views > 0:
            dominant = max(analytics.traffic_sources, key=lambda s: s.views)
            dominant_pct = dominant.views / total_views * 100
            if dominant_pct > 80:
                label = _format_traffic_source(dominant.source_type)
                improvements.append(
                    Improvement(
                        priority="medium",
                        category="流入元",
                        title=f"流入の {dominant_pct:.0f}% が「{label}」に偏っています",
                        description="他の流入源（検索・関連動画・外部）向けの最適化でリスク分散を図ってください。",
                    )
                )

            weak_sources = [
                s for s in analytics.traffic_sources
                if s.views / total_views < 0.05 and s.views > 0
            ]
            if weak_sources:
                weak_labels = [
                    _format_traffic_source(s.source_type) for s in weak_sources[:3]
                ]
                improvements.append(
                    Improvement(
                        priority="low",
                        category="流入元",
                        title="弱い流入源があります",
                        description=f"「{', '.join(weak_labels)}」向けのSEO・タグ・外部導線を強化できます。",
                    )
                )

    # Subscriber conversion
    conversion_candidates = [
        r for r in video_rows
        if r.period_views and r.period_views >= 100 and r.subscribers_gained is not None
    ]
    if conversion_candidates:
        conversions = [
            r.subscribers_gained / r.period_views
            for r in conversion_candidates
            if r.subscribers_gained is not None
        ]
        if conversions:
            median_conv = _median(conversions)
            low_conv = [
                r for r in conversion_candidates
                if r.subscribers_gained is not None
                and r.period_views
                and (r.subscribers_gained / r.period_views) < median_conv * 0.5
            ]
            if low_conv:
                improvements.append(
                    Improvement(
                        priority="medium",
                        category="登録者転換",
                        title="登録者獲得率が低い動画があります",
                        description="エンディングの登録CTAやチャンネル価値の訴求を強化してください。",
                        affected_items=[r.title[:60] for r in low_conv[:5]],
                    )
                )

    # Views decline
    cur_views = analytics.current_period.views
    prev_views = analytics.previous_period.views
    change = _pct_change(cur_views, prev_views)
    if change is not None and change < -10:
        improvements.append(
            Improvement(
                priority="high",
                category="成長",
                title=f"再生数が前期比 {change:.1f}% 減少しています",
                description="トレンド動画の企画、サムネ・タイトルのA/Bテスト、投稿タイミングの見直しを検討してください。",
            )
        )

    priority_order = {"high": 0, "medium": 1, "low": 2}
    improvements.sort(key=lambda i: priority_order[i.priority])
    return improvements


def generate_action_items(improvements: list[Improvement]) -> list[str]:
    """Derive 3-5 concrete action items from improvements."""
    actions: list[str] = []
    seen: set[str] = set()

    action_map = {
        "視聴維持率": "直近の低維持率動画を視聴し、冒頭30秒のフックを改善する",
        "エンゲージメント": "次の動画にいいね・コメント誘導のCTAを明確に入れる",
        "投稿頻度": "今月の投稿カレンダーを作成し、最低4本の投稿を計画する",
        "流入元": "検索流入を増やすため、タイトル・説明文・タグのキーワードを見直す",
        "登録者転換": "動画終了画面に登録ボタンとチャンネル価値の訴求を追加する",
        "成長": "伸びている動画のテーマでシリーズ企画を3本立案する",
        "成功パターン": "上位動画の構成テンプレートを文書化し、次回企画に適用する",
    }

    for imp in improvements:
        action = action_map.get(imp.category)
        if action and action not in seen:
            actions.append(action)
            seen.add(action)
        if len(actions) >= 5:
            break

    if not actions:
        actions.append("現状維持のため、週次で主要指標をモニタリングする")

    return actions[:5]


def compute_upload_interval(videos: list[VideoInfo]) -> float | None:
    if len(videos) < 2:
        return None
    sorted_videos = sorted(videos, key=lambda v: v.published_at)
    intervals: list[float] = []
    for i in range(1, len(sorted_videos)):
        delta = sorted_videos[i].published_at - sorted_videos[i - 1].published_at
        intervals.append(delta.total_seconds() / 86400)
    return statistics.mean(intervals) if intervals else None


def analyze_channel(
    channel: ChannelInfo,
    videos: list[VideoInfo],
    analytics: AnalyticsData,
    period_days: int,
) -> AnalysisResult:
    """Run full channel analysis."""
    growth = compute_growth(analytics)
    video_rows = build_video_rows(videos, analytics)
    avg_interval = compute_upload_interval(videos)

    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=period_days)
    videos_in_period = sum(1 for v in videos if v.published_at >= period_start)

    achievements = detect_achievements(channel, growth, video_rows, analytics)
    improvements = detect_improvements(
        video_rows, analytics, period_days, avg_interval
    )
    action_items = generate_action_items(improvements)

    return AnalysisResult(
        channel=channel,
        period_days=period_days,
        analyzed_at=now,
        growth=growth,
        achievements=achievements,
        improvements=improvements,
        action_items=action_items,
        video_rows=video_rows,
        traffic_sources=analytics.traffic_sources,
        total_period_views=analytics.current_period.views,
        total_period_watch_minutes=analytics.current_period.estimated_minutes_watched,
        avg_view_duration=analytics.current_period.average_view_duration,
        videos_in_period=videos_in_period,
        avg_upload_interval_days=avg_interval,
    )
