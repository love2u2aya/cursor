# Zoom Companion - Windows セットアップ
# PowerShell で実行:  .\scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Zoom Companion セットアップ (Windows) ===" -ForegroundColor Cyan
Write-Host "作業ディレクトリ: $Root"
Write-Host ""

# 前提チェック
function Test-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "NG: $name が見つかりません" -ForegroundColor Red
        return $false
    }
    Write-Host "OK: $name" -ForegroundColor Green
    return $true
}

$ok = $true
$ok = (Test-Command "node") -and $ok
$ok = (Test-Command "npm") -and $ok
$ok = (Test-Command "python") -and $ok
if (-not $ok) {
    Write-Host ""
    Write-Host "以下をインストールしてから再実行してください:" -ForegroundColor Yellow
    Write-Host "  - Node.js LTS: https://nodejs.org/"
    Write-Host "  - Python 3.10+: https://www.python.org/downloads/ (Add to PATH にチェック)"
    exit 1
}

Write-Host ""
Write-Host "Node: $(node -v)  npm: $(npm -v)  Python: $(python --version)" -ForegroundColor Gray

# .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host ".env を作成しました。OPENAI_API_KEY は任意（未設定でもデモは動きます）" -ForegroundColor Yellow
}

# API
Write-Host ""
Write-Host "--- API 依存関係 ---" -ForegroundColor Cyan
Set-Location "$Root\apps\api"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".\.venv\Scripts\pip.exe" install -r requirements.txt -q
Set-Location $Root

# Web
Write-Host "--- Web 依存関係 ---" -ForegroundColor Cyan
Set-Location "$Root\apps\web"
npm install --silent
Set-Location $Root

Write-Host ""
Write-Host "=== セットアップ完了 ===" -ForegroundColor Green
Write-Host ""
Write-Host "起動するには:" -ForegroundColor White
Write-Host "  .\scripts\start-windows.ps1"
Write-Host ""
Write-Host "または start.bat をダブルクリック"
Write-Host ""
Write-Host "ブラウザで http://localhost:3000 を開き「デモを再生」をクリック"
