# deploy_bot.ps1 — Deploy VOLKI Telegram Bot to Ubuntu server
# Usage: .\bot\deploy_bot.ps1

$ErrorActionPreference = "Stop"

$ServerIP = "5.252.155.147"
$ServerUser = "root"
$ServerPass = "os1mw7Xk7U6t3lG5"
$RemoteDir = "/opt/bots/volki1303"
$BotFile = "$PSScriptRoot\volki_bot.py"
$ServiceFile = "$PSScriptRoot\volki-bot.service"

Write-Host "`n🐺 VOLKI 13:03 — Bot Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor DarkGray

# Import Posh-SSH
try {
    Import-Module Posh-SSH -ErrorAction Stop
} catch {
    Write-Host "Installing Posh-SSH module..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -SkipPublisherCheck
    Import-Module Posh-SSH
}

# Create credential
$secPass = ConvertTo-SecureString $ServerPass -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($ServerUser, $secPass)

Write-Host "[1/5] Connecting to $ServerIP..." -ForegroundColor Yellow
$session = New-SSHSession -ComputerName $ServerIP -Credential $cred -AcceptKey -Force

if (-not $session) {
    Write-Host "ERROR: Failed to connect!" -ForegroundColor Red
    exit 1
}

Write-Host "[2/5] Creating remote directory..." -ForegroundColor Yellow
Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p $RemoteDir"

Write-Host "[3/5] Uploading bot files..." -ForegroundColor Yellow
# Upload bot script
Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path $BotFile -Destination $RemoteDir -AcceptKey
# Upload service file
Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path $ServiceFile -Destination $RemoteDir -AcceptKey

Write-Host "[4/5] Installing systemd service..." -ForegroundColor Yellow
$installCmd = @"
cp $RemoteDir/volki-bot.service /etc/systemd/system/volki-bot.service
systemctl daemon-reload
systemctl enable volki-bot
systemctl restart volki-bot
"@
Invoke-SSHCommand -SessionId $session.SessionId -Command $installCmd

Write-Host "[5/5] Checking bot status..." -ForegroundColor Yellow
$status = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl status volki-bot --no-pager 2>&1 | head -15"
Write-Host $status.Output -ForegroundColor Green

# Cleanup
Remove-SSHSession -SessionId $session.SessionId | Out-Null

Write-Host "`n✅ Bot deployed successfully!" -ForegroundColor Green
Write-Host "   Server: $ServerIP" -ForegroundColor DarkGray
Write-Host "   Service: volki-bot.service" -ForegroundColor DarkGray
Write-Host "   Commands:" -ForegroundColor DarkGray
Write-Host "     systemctl status volki-bot" -ForegroundColor DarkGray
Write-Host "     journalctl -u volki-bot -f" -ForegroundColor DarkGray
