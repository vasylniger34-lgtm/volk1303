$ErrorActionPreference = "Stop"

$ServerIP = "5.252.155.147"
$ServerUser = "root"
$ServerPass = "os1mw7Xk7U6t3lG5"
$RemoteDir = "/opt/bots/volki1303"
$BotDir = "c:\Users\avefa\CASH FLOW\volk new\volk1303\bot"

Write-Host ""
Write-Host "VOLKI 13:03 Bot Deployment" -ForegroundColor Cyan
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

Write-Host "[1/6] Connecting..." -ForegroundColor Yellow
$session = New-SSHSession -ComputerName $ServerIP -Credential $cred -AcceptKey -Force

if (-not $session) {
    Write-Host "ERROR: Failed to connect!" -ForegroundColor Red
    exit 1
}
Write-Host "  Connected!" -ForegroundColor Green

Write-Host "[2/6] Creating remote directory..." -ForegroundColor Yellow
Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p $RemoteDir"

Write-Host "[3/6] Uploading bot files..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path "$BotDir\volki_bot.py" -Destination $RemoteDir -AcceptKey
Write-Host "  Uploaded volki_bot.py" -ForegroundColor Green

Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path "$BotDir\volki-bot.service" -Destination $RemoteDir -AcceptKey
Write-Host "  Uploaded volki-bot.service" -ForegroundColor Green

Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path "$BotDir\admin_chat_ids.json" -Destination $RemoteDir -AcceptKey
Write-Host "  Uploaded admin_chat_ids.json" -ForegroundColor Green

Write-Host "[4/6] Installing systemd service..." -ForegroundColor Yellow
$installCmd = "cp $RemoteDir/volki-bot.service /etc/systemd/system/volki-bot.service && systemctl daemon-reload && systemctl enable volki-bot && systemctl restart volki-bot"
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $installCmd
if ($result.Output) { Write-Host $result.Output }

Write-Host "[5/6] Waiting 3s and checking status..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$status = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl is-active volki-bot"
Write-Host ("  Service: " + $status.Output) -ForegroundColor Green

$logs = Invoke-SSHCommand -SessionId $session.SessionId -Command "journalctl -u volki-bot -n 10 --no-pager"
Write-Host ""
Write-Host "  Recent logs:" -ForegroundColor Yellow
Write-Host $logs.Output

Write-Host "[6/6] Checking Python3..." -ForegroundColor Yellow
$pyVer = Invoke-SSHCommand -SessionId $session.SessionId -Command "python3 --version"
Write-Host ("  " + $pyVer.Output) -ForegroundColor Green

# Cleanup
Remove-SSHSession -SessionId $session.SessionId | Out-Null

Write-Host ""
Write-Host "Bot deployed successfully!" -ForegroundColor Green
Write-Host ("   Server: " + $ServerIP) -ForegroundColor DarkGray
Write-Host "   Service: volki-bot.service" -ForegroundColor DarkGray
