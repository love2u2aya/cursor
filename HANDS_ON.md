# Git × Cursor ハンズオン（高校生向け）

このリポジトリで **いま実際に起きていること** を、自分の手でも再現するための手順です。

---

## 0. いま起きていること（これが Cloud）

あなたがこのチャットで話している相手（AI）は、あなたの Mac ではなく **Cursor のクラウド上のパソコン** で作業しています。

```text
あなた（チャット）
   │
   ▼
☁️ Cloud（このエージェント）
   │  ファイルを作る / commit する
   ▼
GitHub（共有ロッカー）へ push
   │
   ▼
Pull Request（「この変更入れていい？」）
```

つまり今この練習用ファイルを作っている作業自体が、**Cloud の体験**です。

| Cursor の選択肢 | このハンズオンでの位置づけ |
|-----------------|----------------------------|
| ☁️ **Cloud** | 今ここ（AI がネット上で編集 → PR） |
| 💻 **On This Mac** | 下の「自分でやる編」 |
| 🏠 **No Repo** | リポジトリを開かずに雑談・下書きするとき |

---

## 1. まず見るだけ（所要 2分）

### A. セーブポイントの見た目

1. このリポジトリで `git-practice/index.html` を開く  
2. 右クリック → **Open with Live Preview** やブラウザで開く（方法は環境による）  
3. 「セーブ 1 → 2 → 3」が並んでいるのを見る  

→ これが **commit（履歴のセーブ）** のイメージです。

### B. 履歴をターミナルで見る

Cursor のターミナルで:

```bash
git log --oneline
```

こんな感じで、セーブが下から上へ積まれます。

```text
xxxxxx  Add visual save-point page...   ← 新しい
xxxxxx  Add second save point...
xxxxxx  Add first save point...
xxxxxx  Initial commit                  ← 古い
```

---

## 2. 自分でやる編（On This Mac）

### 準備

1. Cursor 左上のプロジェクト切替で、このリポジトリを **💻 On This Mac** で開く  
   （まだ PC に無い場合は GitHub から clone、または Cursor の Recents / Use Existing から開く）
2. ターミナルを開く

### Step 1 — 今どこにいる？

```bash
pwd
git status
git branch
```

- `git status` … いま変更があるか  
- `git branch` … どの平行世界（ブランチ）にいるか  

### Step 2 — 自分用のブランチを作る

本番（`main`）を直接いじらず、練習用ルートを作ります。

```bash
git checkout main
git pull origin main
git checkout -b practice/my-first-save
```

→ **branch** = 本線を壊さない下書きルート

### Step 3 — ファイルを少し変える

`git-practice/save-log.md` の末尾に、自分のセーブを足す。

```markdown
## セーブ（自分）

- 日付: （今日）
- できたこと: On This Mac で初めて commit した
- 気分: （自由に書く）
```

保存したら:

```bash
git status
git diff
```

- `status` … 何が変わったか（まだセーブ前）  
- `diff` … 具体的にどの行が変わったか  

### Step 4 — セーブする（commit）

```bash
git add git-practice/save-log.md
git commit -m "Add my own save point on This Mac"
git log --oneline -5
```

これで **あなたのセーブポイント** が履歴に残りました。

### Step 5 — 共有ロッカーへ送る（push）

```bash
git push -u origin practice/my-first-save
```

→ GitHub に自分のブランチが現れます。

### Step 6 — Pull Request を出す（任意）

GitHub のページで **Compare & pull request** を押すか、Cursor から PR を作ります。

意味はただ一つ:

> 「この下書きルートの変更を、本線 `main` に入れていい？」

---

## 3. 単語チートシート

| 操作 | たとえ | コマンド例 |
|------|--------|------------|
| status | 机の上を見る | `git status` |
| add | セーブする荷物を選ぶ | `git add ファイル` |
| commit | セーブポイントを打つ | `git commit -m "メッセージ"` |
| log | セーブ一覧 | `git log --oneline` |
| branch | 平行世界 | `git checkout -b 名前` |
| push | ロッカーへ提出 | `git push` |
| pull | ロッカーから取り寄せ | `git pull` |
| PR | 合流の申請書 | GitHub 上で作成 |

---

## 4. よくあるつまずき

- **On This Mac が無い**  
  そのリポジトリのフォルダをまだ Mac で開いていないことが多いです。先に clone / Open Folder してください。
- **push できない**  
  GitHub ログインや権限の問題です。Cursor / GitHub の連携を確認。
- **main を直接編集してしまった**  
  大事なのは「次からブランチを切る」こと。壊れた感じがしたら大人や AI に「main を触ってしまった」と相談。

---

## 5. クリア条件（ここまでできたらOK）

- [ ] `git log` で複数のセーブが見える  
- [ ] 自分のブランチで 1 回 commit できた  
- [ ] （できれば）push または PR までできた  
- [ ] Cloud / On This Mac / No Repo の違いを一言で言える  

一言答えの例:

> No Repo は白紙、On This Mac は自分の机、Cloud はネット上の研究室。Git はその机や研究室の「セーブ履歴」。
