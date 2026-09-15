"""HANDOFF の台本セクションから、Google ドキュメントに上げる docx を書き出す。

Google ドライブにアップロードして「Google ドキュメントで開く」で崩れないよう、
見出しレベルと本文段落だけを使い、装飾は最小限にする。
"""

import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

HANDOFF = Path("★AI関連ファイル/projects/_HANDOFF.md")
OUT_DIR = Path("★AI関連ファイル/projects")

SCRIPT_HEAD = "## 15. 台本（まるごと）"
CUT_HEAD = "### 時間が押した時の切り方（12分版）"
VOICE_HEAD = "### 声に出すときの注意"

# 読み上げ用の字を大きくする。手元でもスマホでも追える下限。
BODY_PT = 13
SCRIPT_BODY_PT = 15


def load_sections(text):
    """台本セクションを {見出し: 本文} に分解する。"""
    body = text.split(SCRIPT_HEAD, 1)[1]
    parts = re.split(r"\n### ", body)
    preamble = parts[0]
    sections = []
    for part in parts[1:]:
        lines = part.split("\n")
        sections.append((lines[0].strip(), "\n".join(lines[1:])))
    return preamble, sections


def clean(block):
    """markdown の装飾と行末の強制改行を落とし、段落のリストにする。"""
    block = block.replace("---", "")
    paragraphs = []
    for raw in re.split(r"\n\s*\n", block):
        lines = []
        for line in raw.split("\n"):
            line = line.rstrip().rstrip("　").rstrip()
            line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
            line = re.sub(r"`(.+?)`", r"\1", line)
            if line.strip() in ("", "---"):
                continue
            lines.append(line.strip())
        if lines:
            paragraphs.append(lines)
    return paragraphs


def set_base_font(doc, size_pt):
    style = doc.styles["Normal"]
    style.font.name = "Noto Sans JP"
    style.font.size = Pt(size_pt)
    style.paragraph_format.space_after = Pt(6)


def add_lines(doc, lines, size_pt):
    """1段落の中の改行は、読む息継ぎなので改行として残す。"""
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for index, line in enumerate(lines):
        run = para.add_run(line)
        run.font.size = Pt(size_pt)
        if index < len(lines) - 1:
            run.add_break()
    return para


def build_script(preamble, sections, path):
    doc = Document()
    set_base_font(doc, SCRIPT_BODY_PT)

    doc.add_heading("金利のある世界で、増えるのは利息だけではない", level=0)
    subtitle = doc.add_paragraph("15分講座　台本")
    subtitle.runs[0].font.size = Pt(BODY_PT)

    for lines in clean(preamble):
        if lines[0].startswith("- ") or lines[0].startswith("話し方の約束"):
            continue
        add_lines(doc, lines, BODY_PT)

    for title, block in sections:
        if title.startswith(("時間が押した", "声に出すとき", "選んで削る")):
            continue
        doc.add_heading(title, level=1)
        for lines in clean(block):
            add_lines(doc, lines, SCRIPT_BODY_PT)

    doc.save(path)
    return path


def build_cheat(text, sections, path):
    doc = Document()
    set_base_font(doc, BODY_PT)

    doc.add_heading("金利のある世界　カンニング用", level=0)

    doc.add_heading("4つの棚", level=1)
    for line in [
        "勧誘　動かしたくなる",
        "縛り　動かすと使えなくなる",
        "負担　動かさなくても痛む",
        "頭　思い込み。平均やニュースで誤る",
    ]:
        doc.add_paragraph(line, style="List Number")

    doc.add_heading("各棚の今日の一手", level=1)
    for line in [
        "勧誘　その場で契約しないこと",
        "縛り　長期の定期を増やさないこと",
        "負担　繰上げ返済のボタンを、今日は押さないこと",
        "頭　金利ニュースで配分を変えないこと",
    ]:
        doc.add_paragraph(line, style="List Bullet")

    doc.add_heading("時間の目安", level=1)
    for line in [
        "0–2　地図。前回との違い。棚は4つ、注意点は14",
        "2–5　勧誘（代表は銀行）",
        "5–8　縛り（代表は定期）",
        "8–11　負担（繰上げを止める。125%と見直し確認）",
        "11–13　頭（代表は平均）",
        "13–15　4つを1つに。3ヶ月は増やさない。11月に掃除",
    ]:
        doc.add_paragraph(line, style="List Bullet")

    doc.add_heading("締めの一言", level=1)
    add_lines(
        doc,
        ["勧誘、縛り、負担、頭。", "利息より先に、引っかかりを疑ってください。"],
        BODY_PT,
    )

    for head in (CUT_HEAD, VOICE_HEAD):
        title = head.replace("### ", "")
        block = text.split(head, 1)[1]
        block = re.split(r"\n### |\n## ", block)[0]
        doc.add_heading(title, level=1)
        for lines in clean(block):
            first = lines[0]
            if first.startswith(("- ", "1. ", "2. ", "3. ", "4. ")):
                for line in lines:
                    doc.add_paragraph(
                        re.sub(r"^(- |\d+\. )", "", line), style="List Bullet"
                    )
            else:
                add_lines(doc, lines, BODY_PT)

    doc.save(path)
    return path


def main():
    text = HANDOFF.read_text(encoding="utf-8")
    preamble, sections = load_sections(text)
    script = build_script(
        preamble, sections, OUT_DIR / "台本_Googleドキュメント用.docx"
    )
    cheat = build_cheat(
        text, sections, OUT_DIR / "カンニング用_Googleドキュメント用.docx"
    )
    for path in (script, cheat):
        print(f"{path}  {path.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
