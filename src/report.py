"""Markdown report generation."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from src.analyzer import (
    AnalysisResult,
    Improvement,
    _format_traffic_source,
)


def _format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}秒"
    minutes = seconds // 60
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}分{secs}秒" if secs else f"{minutes}分"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}時間{mins}分"


def _format_pct(value: float | None, suffix: str = "%") -> str:
    if value is None:
        return "N/A"
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.1f}{suffix}"


def _priority_label(priority: str) -> str:
    labels = {"high": "高", "medium": "中", "low": "低"}
    return labels.get(priority, priority)


def _render_improvement(imp: Improvement, index: int) -> str:
    lines = [
        f"### {index}. [{_priority_label(imp.priority)}] {imp.title}",
        "",
        f"**カテゴリ**: {imp.category}",
        "",
        imp.description,
    ]
    if imp.affected_items:
        lines.append("")
        lines.append("**対象動画**:")
        for item in imp.affected_items:
            lines.append(f"- {item}")
    return "\n".join(lines)


def generate_report(result: AnalysisResult) -> str:
    """Generate full Markdown report from analysis result."""
    ch = result.channel
    g = result.growth
    analyzed = result.analyzed_at.strftime("%Y-%m-%d %H:%M UTC")

    sections: list[str] = []

    # Header
    sections.append(f"# YouTube チャンネル分析レポート: {ch.title}")
    sections.append("")
    sections.append(f"- **分析日時**: {analyzed}")
    sections.append(f"- **分析期間**: 直近 {result.period_days} 日")
    sections.append(f"- **チャンネルID**: `{ch.channel_id}`")
    sections.append("")

    # Executive summary
    sections.append("## 1. エグゼクティブサマリー")
    sections.append("")
    sections.append("| 指標 | 値 | 前期比 |")
    sections.append("|------|-----|--------|")
    sections.append(
        f"| 登録者数 | {ch.subscriber_count:,} 人 | "
        f"純増 {g.subscribers_net_change:+,} 人 |"
    )
    sections.append(
        f"| 期間再生数 | {result.total_period_views:,} 回 | "
        f"{_format_pct(g.views_change_pct)} |"
    )
    sections.append(
        f"| 期間視聴時間 | {result.total_period_watch_minutes:,.0f} 分 | "
        f"{_format_pct(g.watch_time_change_pct)} |"
    )
    sections.append(
        f"| 平均視聴時間 | {_format_duration(int(result.avg_view_duration))} | - |"
    )
    sections.append(
        f"| 期間内の投稿数 | {result.videos_in_period} 本 | - |"
    )
    if result.avg_upload_interval_days is not None:
        sections.append(
            f"| 平均投稿間隔 | {result.avg_upload_interval_days:.1f} 日 | - |"
        )
    sections.append("")

    # Achievements
    sections.append("## 2. 成果ハイライト")
    sections.append("")
    if result.achievements:
        for ach in result.achievements:
            sections.append(f"### {ach.category}: {ach.title}")
            sections.append("")
            sections.append(ach.description)
            sections.append("")
    else:
        sections.append("該当する成果は検出されませんでした。")
        sections.append("")

    # Improvements
    sections.append("## 3. 改善候補")
    sections.append("")
    if result.improvements:
        for i, imp in enumerate(result.improvements, 1):
            sections.append(_render_improvement(imp, i))
            sections.append("")
    else:
        sections.append("現時点で顕著な改善点は検出されませんでした。現状維持を継続し、定期的にモニタリングしてください。")
        sections.append("")

    # Traffic sources
    if result.traffic_sources:
        sections.append("## 4. 流入元内訳")
        sections.append("")
        total_views = sum(s.views for s in result.traffic_sources)
        sections.append("| 流入元 | 再生数 | 割合 | 視聴時間(分) |")
        sections.append("|--------|--------|------|-------------|")
        for src in result.traffic_sources:
            pct = (src.views / total_views * 100) if total_views else 0
            label = _format_traffic_source(src.source_type)
            sections.append(
                f"| {label} | {src.views:,} | {pct:.1f}% | "
                f"{src.estimated_minutes_watched:,.0f} |"
            )
        sections.append("")

    # Video table
    sections.append("## 5. 動画別詳細")
    sections.append("")
    if result.video_rows:
        sections.append(
            "| タイトル | 公開日 | 尺 | 再生数 | いいね率 | 維持率 | 期間再生 |"
        )
        sections.append(
            "|----------|--------|-----|--------|----------|--------|----------|"
        )
        for row in result.video_rows:
            title = row.title[:40] + ("..." if len(row.title) > 40 else "")
            pub = row.published_at.strftime("%Y-%m-%d")
            dur = _format_duration(row.duration_seconds)
            like_pct = f"{row.like_rate * 100:.2f}%"
            retention = (
                f"{row.retention_rate * 100:.1f}%"
                if row.retention_rate is not None
                else "N/A"
            )
            period_v = f"{row.period_views:,}" if row.period_views is not None else "N/A"
            sections.append(
                f"| {title} | {pub} | {dur} | {row.view_count:,} | "
                f"{like_pct} | {retention} | {period_v} |"
            )
        sections.append("")
    else:
        sections.append("分析対象の動画がありません。")
        sections.append("")

    # Action items
    sections.append("## 6. 次のアクション")
    sections.append("")
    for i, action in enumerate(result.action_items, 1):
        sections.append(f"{i}. {action}")
    sections.append("")

    # Footer
    sections.append("---")
    sections.append("")
    sections.append(
        "*このレポートは YouTube Data API v3 と YouTube Analytics API のデータに基づき自動生成されました。*"
    )

    return "\n".join(sections)


def save_report(
    result: AnalysisResult,
    output_dir: Path,
) -> Path:
    """Generate and save report to file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = result.analyzed_at.strftime("%Y-%m-%d")
    filename = f"channel_report_{date_str}.md"
    output_path = output_dir / filename

    content = generate_report(result)
    output_path.write_text(content, encoding="utf-8")
    return output_path
