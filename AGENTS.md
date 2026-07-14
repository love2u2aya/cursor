# AGENTS.md

## リポジトリ構成（重要）

このリポジトリは「1リポジトリ・多プロダクト」構成です。ベースブランチ `main` はプレースホルダ（`README.md` のみ）で **アプリコードを含みません**。実際のプロダクトはそれぞれ独立したブランチにあります。作業・実行する際は対象ブランチをチェックアウトしてください。

| ブランチ | プロダクト | スタック | 実行 |
|---|---|---|---|
| `cursor/fp-exclusive-workspace-33a4` | FP Platform（FP向け非公開ワークスペース） | Next.js 16 / React 19 / Tailwind v4 | 実行可 |
| `cursor/zoom-companion-0fe9` | Zoom Companion（会議アシスタント） | FastAPI + ChromaDB / Next.js 15 | 実行可（複数サービス） |
| `cursor/youtube-channel-analytics-1817` | YouTube Channel Analytics（CLI） | Python + Google API | 実行可（CLI） |
| `cursor/coupon-card-design-reference-448b` | クーポンカード設計 | Markdown ドキュメントのみ | 実行対象なし |
| `cursor/git-hands-on-d50c` | Git 練習教材 | 静的 HTML / Markdown | 実行対象なし |

## Cursor Cloud specific instructions

### 依存インストール（update script が自動実行）
VM 起動時の update script が、チェックアウト中のブランチに存在するマニフェストを検出して自動で依存をインストールします（`fp-platform/`・`apps/web/` は npm、ルート `requirements.txt`・`apps/api/requirements.txt` は `.venv` に pip）。`main` では該当ファイルが無いため何もしません。ブランチ切り替え後に依存が入っていない場合は、そのブランチで update script 相当（`npm install --prefix <dir>` / `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`）を再実行してください。

- `python3.12-venv` はスナップショットに導入済み（venv 作成に必須）。
- Python プロダクトは system Python ではなく `.venv` を使う（Ubuntu 24.04 は externally-managed）。

### FP Platform（`cursor/fp-exclusive-workspace-33a4`）
- 起動: `npm run dev --prefix fp-platform`（`http://localhost:3000`、ログインは `/fp/login`）。lint は `npm run lint --prefix fp-platform`。
- デモログイン: `fp@demo.local` / `demo1234`。データは `fp-platform/.data/db.json` に保存（外部DB不要）。
- **Next.js 16 は破壊的変更あり**。コード変更前に `fp-platform/node_modules/next/dist/docs/` を参照すること（`fp-platform/AGENTS.md` の警告）。`OPENAI_API_KEY` はファイル文字起こし等の任意機能のみで必須ではない。

### Zoom Companion（`cursor/zoom-companion-0fe9`）
- API: `apps/api/.venv/bin/uvicorn main:app --port 8000`（`apps/api/` から実行）。Web: `npm run dev --prefix apps/web`（既定 3000。FP と同時起動する場合は `-- --port 3001` 等で回避）。
- **API 初回起動時に ChromaDB が埋め込みモデル（onnx, 約80MB）を `~/.cache/chroma` にダウンロード**するため数十秒かかる。以降はキャッシュ利用。ChromaDB のテレメトリ警告（`capture() takes 1 positional argument...`）は無害。
- `OPENAI_API_KEY` 未設定でも起動可（デモモード）。Web の「同意して開始」→「デモを再生」はクライアント側完結で API・シークレット不要。`apps/capture`（デスクトップ音声取り込み）は任意で、OS 仮想オーディオデバイスが必要なため Cloud VM では通常対象外。

### YouTube Channel Analytics（`cursor/youtube-channel-analytics-1817`）
- 依存は `.venv`。クレデンシャル不要の検証は `.venv/bin/python scripts/test_mock_analysis.py`（`reports/` にレポート生成）。
- 実データ取得には Google OAuth（`client_secret.json` + 対話ブラウザ認証）が必要で Cloud VM では通常不可。モック解析で E2E 検証する。
