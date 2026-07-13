#!/usr/bin/env python3
"""CLI entry point for YouTube channel analytics."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")


def cmd_auth(_args: argparse.Namespace) -> int:
    from src.auth import run_auth_flow

    try:
        run_auth_flow()
        return 0
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Authentication failed: {e}", file=sys.stderr)
        return 1


def cmd_analyze(args: argparse.Namespace) -> int:
    from src.analytics_api import fetch_all_analytics
    from src.analyzer import analyze_channel
    from src.auth import build_analytics_service, build_youtube_service, get_credentials
    from src.data_api import get_channel_info, get_uploaded_videos, get_video_details
    from src.report import generate_report, save_report

    try:
        creds = get_credentials()
        youtube = build_youtube_service(creds)
        analytics = build_analytics_service(creds)

        print("Fetching channel information...")
        channel = get_channel_info(youtube)
        print(f"Channel: {channel.title} ({channel.subscriber_count:,} subscribers)")

        print(f"Fetching up to {args.max_videos} videos...")
        video_ids = get_uploaded_videos(
            youtube, channel.uploads_playlist_id, max_videos=args.max_videos
        )
        videos = get_video_details(youtube, video_ids)
        print(f"Loaded {len(videos)} videos")

        print(f"Fetching analytics for the last {args.days} days...")
        analytics_data = fetch_all_analytics(analytics, video_ids, days=args.days)

        print("Analyzing...")
        result = analyze_channel(channel, videos, analytics_data, period_days=args.days)

        output_dir = Path(args.output)
        if not output_dir.is_absolute():
            output_dir = PROJECT_ROOT / output_dir

        report_path = save_report(result, output_dir)
        print(f"\nReport saved to: {report_path}")

        if args.print_summary:
            print("\n" + "=" * 60)
            # Print executive summary to console
            print(f"## {channel.title} - 分析サマリー")
            print(f"期間再生数: {result.total_period_views:,} 回")
            if result.growth.views_change_pct is not None:
                print(f"前期比: {result.growth.views_change_pct:+.1f}%")
            print(f"改善候補: {len(result.improvements)} 件")
            print(f"成果: {len(result.achievements)} 件")
            for action in result.action_items[:3]:
                print(f"  - {action}")

        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Run 'python scripts/analyze_channel.py auth' first.", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Analysis failed: {e}", file=sys.stderr)
        raise


def main() -> int:
    default_days = int(os.getenv("DEFAULT_ANALYSIS_DAYS", "90"))
    default_max_videos = int(os.getenv("DEFAULT_MAX_VIDEOS", "50"))
    default_output = os.getenv("REPORT_OUTPUT_DIR", "reports")

    parser = argparse.ArgumentParser(
        description="YouTube channel analytics and improvement report generator",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    auth_parser = subparsers.add_parser("auth", help="Run OAuth authentication flow")
    auth_parser.set_defaults(func=cmd_auth)

    analyze_parser = subparsers.add_parser("analyze", help="Run channel analysis")
    analyze_parser.add_argument(
        "--days",
        type=int,
        default=default_days,
        help=f"Analysis period in days (default: {default_days})",
    )
    analyze_parser.add_argument(
        "--max-videos",
        type=int,
        default=default_max_videos,
        help=f"Maximum videos to analyze (default: {default_max_videos})",
    )
    analyze_parser.add_argument(
        "--output",
        type=str,
        default=default_output,
        help=f"Output directory for reports (default: {default_output})",
    )
    analyze_parser.add_argument(
        "--print-summary",
        action="store_true",
        default=True,
        help="Print summary to console (default: True)",
    )
    analyze_parser.add_argument(
        "--no-print-summary",
        action="store_false",
        dest="print_summary",
        help="Do not print summary to console",
    )
    analyze_parser.set_defaults(func=cmd_analyze)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
