#!/usr/bin/env python3
"""Recount whitespace-stripped chars for the six timed script sections."""
import re
import sys
from pathlib import Path


def recount(path: str) -> list[tuple[str, int, int, int]]:
    text = Path(path).read_text(encoding="utf-8")
    m = re.search(r"^## 15\. 台本", text, re.M)
    if not m:
        raise SystemExit("section 15 not found")
    sec15 = text[m.start() :]
    end = re.search(r"^### 時間が押した", sec15, re.M)
    script = sec15[: end.start()] if end else sec15
    # Require two-digit minutes so keys like 11:00 are not truncated to 11:0
    headers = list(
        re.finditer(r"^### (\d{1,2}:\d{2})[–-](\d{1,2}:\d{2})[^\n]*\n", script, re.M)
    )
    if len(headers) != 6:
        raise SystemExit(
            f"expected 6 sections, got {len(headers)}: "
            f"{[h.group(0).strip() for h in headers]}"
        )
    rows: list[tuple[str, int, int, int]] = []
    print("| section | chars | minutes | chars/min |")
    print("|---|---|---|---|")
    for i, h in enumerate(headers):
        start = h.end()
        stop = headers[i + 1].start() if i + 1 < len(headers) else len(script)
        body = re.sub(r"^---\s*$", "", script[start:stop], flags=re.M)
        n = len(re.sub(r"[\s\u3000]+", "", body))
        a, b = h.group(1), h.group(2)
        dur = int(b.split(":")[0]) - int(a.split(":")[0])
        cpm = round(n / dur) if dur else 0
        rows.append((f"{a}–{b}", n, dur, cpm))
        print(f"| {a}–{b} | {n} | {dur} | {cpm} |")
    total = sum(r[1] for r in rows)
    print(f"total {total} avg {round(total / 15)}")
    return rows


if __name__ == "__main__":
    recount(sys.argv[1] if len(sys.argv) > 1 else "★AI関連ファイル/projects/_HANDOFF.md")
