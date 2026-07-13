# Zoom Companion - Windows 起動
# API と Web を別ウィンドウで起動します

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 未セットアップなら先にセットアップ
if (-not (Test-Path "$Root\apps\web\node_modules")) {
    Write-Host "初回セットアップを実行します..." -ForegroundColor Yellow
    & "$Root\scripts\setup-windows.ps1"
}

Write-Host "=== Zoom Companion 起動 ===" -ForegroundColor Cyan

# API サーバー
$apiCmd = @"
Set-Location '$Root\apps\api'
& '.\.venv\Scripts\Activate.ps1'
Write-Host 'API: http://localhost:8000' -ForegroundColor Green
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd

Start-Sleep -Seconds 3

# Web サーバー
$webCmd = @"
Set-Location '$Root\apps\web'
Write-Host 'Web UI: http://localhost:3000' -ForegroundColor Green
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $webCmd

Start-Sleep -Seconds 5

# ブラウザを開く
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "2つの PowerShell ウィンドウが開きました（API / Web）" -ForegroundColor Green
Write-Host "ブラウザで http://localhost:3000 が開きます"
Write-Host ""
Write-Host "確認手順:" -ForegroundColor White
Write-Host "  1. 「同意して開始」"
Write-Host "  2. 「デモを再生」ボタンをクリック"
Write-Host "  3. トランスクリプトと関連情報が順番に表示されればOK"
Write-Host ""
Write-Host "終了するときは API / Web のウィンドウを閉じてください。"
