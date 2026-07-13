# Zoom Companion

Zoom会議の音声を聞き取り、社内ナレッジや要約などの関連情報をコンパニオン画面に表示するツールです。約30〜60秒の遅延で処理します。

## 構成

```
apps/
  api/       FastAPI バックエンド（WebSocket + STT + RAG）
  web/       Next.js コンパニオンUI
  capture/   デスクトップ版Zoom向け音声キャプチャCLI
data/
  knowledge/ ナレッジベース（Markdown）
```

## クイックスタート

### Windows で試す（いちばん簡単）

**必要なもの:** [Node.js LTS](https://nodejs.org/) と [Python 3.10+](https://www.python.org/downloads/)（インストール時に「Add to PATH」にチェック）

```powershell
# 1. リポジトリを取得（未クローンの場合）
git clone https://github.com/love2u2aya/cursor.git
cd cursor
git checkout cursor/zoom-companion-0fe9

# 2. セットアップ（初回のみ）
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1

# 3. 起動
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

または **`start.bat` をダブルクリック** でも起動できます。

ブラウザで http://localhost:3000 が開いたら:
1. 「同意して開始」
2. 「**デモを再生**」をクリック → 約10秒でUIが反応します（Zoom不要・APIキー不要）

### 1. 環境変数

```bash
cp .env.example .env
# OPENAI_API_KEY を設定（Whisper STT と文脈抽出に使用）
```

### 2. Docker Compose

```bash
docker compose up --build
```

- Web UI: http://localhost:3000
- API: http://localhost:8000

### 3. ローカル開発

**Windows (PowerShell):**
```powershell
# ターミナル1 - API
cd apps\api
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# ターミナル2 - Web
cd apps\web
npm run dev
```

**macOS / Linux:**
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
KNOWLEDGE_DIR=../../data/knowledge CHROMA_PERSIST_DIR=../../data/chroma \
  uvicorn main:app --reload --port 8000
```

**Web:**
```bash
cd apps/web
npm install
npm run dev
```

## 使い方

### ブラウザ版Zoom（推奨・初回）

1. http://localhost:3000 を別モニターで開く
2. 「同意して開始」→「セッション開始」
3. 「Zoomタブの音声を共有」をクリック
4. Zoomのブラウザタブを選択し、**「タブの音声も共有」**を有効にする
5. 約30秒ごとにトランスクリプトと関連ナレッジが表示される

### デスクトップ版Zoom（CLI）

```bash
cd apps/capture
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 利用可能な音声デバイスを確認
python main.py --list-devices

# キャプチャ開始（APIが起動していること）
python main.py --api-url http://localhost:8000
```

#### OS別セットアップ

**macOS**
- [BlackHole](https://existential.audio/blackhole/) 等の仮想オーディオデバイスをインストール
- Zoomのスピーカー出力を BlackHole に設定
- CLIの `--device` で BlackHole のデバイス番号を指定

**Windows**
- ステレオミキサーまたは [VB-Audio Virtual Cable](https://vb-audio.com/Cable/) を有効化
- Zoom出力を仮想ケーブルにルーティング
- `--device` でループバックデバイスを指定

**Linux**
- PulseAudio/PipeWire の monitor ソースを使用
- `pactl list sources short` でデバイス名を確認

## ナレッジベース

`data/knowledge/` に Markdown ファイルを配置すると、起動時に自動インデックスされます。

サンプル:
- `pricing.md` - 料金プラン
- `onboarding.md` - 導入フロー
- `faq.md` - よくある質問

## API

| エンドポイント | 説明 |
|---------------|------|
| `POST /sessions` | セッション作成 |
| `GET /sessions/{id}` | セッション状態取得 |
| `GET /sessions/{id}/export` | 議事録エクスポート（Markdown） |
| `WS /sessions/{id}/audio` | 音声チャンク送受信 |

## 注意事項

- 会議参加者の同意を得てからご利用ください
- `OPENAI_API_KEY` 未設定時はデモモードで動作します（実際の文字起こしは行われません）
- 処理遅延は約30〜60秒です

## コスト目安（1時間の会議）

| 項目 | 概算 |
|------|------|
| Whisper API | 約 $0.36 |
| LLM（文脈抽出） | 約 $0.10〜0.50 |
