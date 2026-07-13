# YouTube チャンネル成果・改善点分析ツール

自社管理の YouTube チャンネルについて、**YouTube Data API v3** と **YouTube Analytics API** を使って成果と改善点を自動で洗い出し、Markdown レポートを生成する CLI ツールです。

## 機能

- チャンネル全体のサマリー（登録者数、総再生数、視聴時間など）
- 動画別パフォーマンス（再生数、エンゲージメント率、平均視聴時間）
- ルールベースの改善点検出（CTR、維持率、投稿頻度、流入元偏りなど）
- 日本語 Markdown レポート出力

## 事前準備

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 以下の API を有効化:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
3. **OAuth 2.0 クライアント ID**（アプリケーションの種類: **デスクトップアプリ**）を作成
4. ダウンロードした JSON をプロジェクトルートに `client_secret.json` として配置

### 2. OAuth 同意画面

- ユーザータイプ: 外部（テスト中はテストユーザーに自分の Google アカウントを追加）
- スコープ:
  - `https://www.googleapis.com/auth/youtube.readonly`
  - `https://www.googleapis.com/auth/yt-analytics.readonly`

### 3. 環境構築

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 必要に応じて編集
```

## 使い方

### 初回認証

```bash
python scripts/analyze_channel.py auth
```

ブラウザが開き、Google アカウントで認証します。成功すると `token.json` が保存されます。

### 分析実行

```bash
# 直近90日を分析（デフォルト）
python scripts/analyze_channel.py analyze

# 期間・動画本数を指定
python scripts/analyze_channel.py analyze --days 30 --max-videos 100

# 出力先を指定
python scripts/analyze_channel.py analyze --output reports/
```

レポートは `reports/channel_report_YYYY-MM-DD.md` に保存されます。

## レポート構成

1. **エグゼクティブサマリー** — 登録者・再生・視聴時間の増減
2. **成果ハイライト** — トップ動画、成長率、ベストエンゲージメント
3. **改善候補** — 優先度付きの改善提案
4. **動画別詳細テーブル**
5. **次のアクション** — 具体的な ToDo

## クォータ

- YouTube Data API v3: 1日 10,000 units
- 50本の動画分析は通常数十 units 程度
- `--max-videos` で取得本数を制限可能

## ディレクトリ構成

```
├── client_secret.json   # Google OAuth 認証情報（gitignore）
├── token.json           # 認証トークン（gitignore）
├── src/
│   ├── auth.py          # OAuth フロー
│   ├── data_api.py      # Data API v3 クライアント
│   ├── analytics_api.py # Analytics API クライアント
│   ├── analyzer.py      # 分析・改善点ルール
│   └── report.py        # Markdown 生成
├── scripts/
│   └── analyze_channel.py
└── reports/
```

## 注意事項

- 自チャンネル（OAuth で認可したチャンネル）のみ分析可能です
- 競合チャンネルの Analytics データは API では取得できません
- `client_secret.json` と `token.json` は Git にコミットしないでください
