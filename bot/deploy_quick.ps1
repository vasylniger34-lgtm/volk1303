$ErrorActionPreference = "Stop"
$ServerIP = "5.252.155.147"
$ServerUser = "root"
$ServerPass = "os1mw7Xk7U6t3lG5"
$RemoteDir = "/opt/bots/volki1303"
$BotFile = "$PSScriptRoot\volki_bot.py"
$ServiceFile = "$PSScriptRoot\volki-bot.service"

Import-Module Posh-SSH
$secPass = ConvertTo-SecureString $ServerPass -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($ServerUser, $secPass)
$session = New-SSHSession -ComputerName $ServerIP -Credential $cred -AcceptKey -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p $RemoteDir"
Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path $BotFile -Destination $RemoteDir -AcceptKey
Set-SCPItem -ComputerName $ServerIP -Credential $cred -Path $ServiceFile -Destination $RemoteDir -AcceptKey

$installCmd = "cp $RemoteDir/volki-bot.service /etc/systemd/system/volki-bot.service && systemctl daemon-reload && systemctl enable volki-bot && systemctl restart volki-bot"
Invoke-SSHCommand -SessionId $session.SessionId -Command $installCmd
Remove-SSHSession -SessionId $session.SessionId | Out-Null
Write-Host "Done"
