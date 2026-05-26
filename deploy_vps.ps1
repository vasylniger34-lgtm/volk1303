# deploy_vps.ps1 — Full deployment of VOLK 1303 to VPS
$ErrorActionPreference = "Stop"

$ServerIP = "203.161.55.65"
$ServerUser = "root"
$ServerPass = "fWNCv520JK0fQ1i2yh"
$Domain = "volk1303.online"
$GitRepo = "https://github.com/vasylniger34-lgtm/volk1303.git"

Write-Host ""
Write-Host "VOLK 13:03 - Full VPS Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor DarkGray

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

Write-Host "[1/8] Connecting to $ServerIP..." -ForegroundColor Yellow
$session = New-SSHSession -ComputerName $ServerIP -Credential $cred -AcceptKey -Force

if (-not $session) {
    Write-Host "ERROR: Failed to connect!" -ForegroundColor Red
    exit 1
}

$sid = $session.SessionId
Write-Host "Connected! Session ID: $sid" -ForegroundColor Green

function Run-SSH($cmd) {
    Write-Host "  > $cmd" -ForegroundColor DarkGray
    $result = Invoke-SSHCommand -SessionId $sid -Command $cmd -TimeOut 300
    if ($result.Output) {
        Write-Host $result.Output -ForegroundColor Gray
    }
    if ($result.ExitStatus -ne 0 -and $result.Error) {
        Write-Host "  WARN: $($result.Error)" -ForegroundColor Yellow
    }
    return $result
}

# STEP 2: System update
Write-Host ""
Write-Host "[2/8] Updating system and installing dependencies..." -ForegroundColor Yellow

Run-SSH "DEBIAN_FRONTEND=noninteractive apt-get update -qq"
Run-SSH "DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq"
Run-SSH "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx certbot python3-certbot-nginx git curl python3 python3-pip ufw"

# Install Node.js 20.x
Run-SSH "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
Run-SSH "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs"
Run-SSH "node --version"
Run-SSH "npm --version"
Run-SSH "python3 --version"

# STEP 3: Clone repo and build frontend
Write-Host ""
Write-Host "[3/8] Cloning repo and building frontend..." -ForegroundColor Yellow

Run-SSH "rm -rf /var/www/volk1303"
Run-SSH "git clone $GitRepo /var/www/volk1303"

# Create .env file
Run-SSH "printf 'VITE_SUPABASE_URL=https://nbjnmzrjlvjbejgeogce.supabase.co\nVITE_SUPABASE_ANON_KEY=sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv\n' > /var/www/volk1303/.env"

Run-SSH "cd /var/www/volk1303 && npm install --production=false 2>&1 | tail -5"
Run-SSH "cd /var/www/volk1303 && npm run build 2>&1 | tail -10"
Run-SSH "ls -la /var/www/volk1303/dist/"

# STEP 4: Create API server
Write-Host ""
Write-Host "[4/8] Creating API server..." -ForegroundColor Yellow

$serverJs = @"
const express = require('express');
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN || '8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU';
const SUPABASE_URL = 'https://nbjnmzrjlvjbejgeogce.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL || '@volki1303';
const WEBAPP_URL = 'https://volk1303.online';

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'volk-api', time: new Date().toISOString() });
});

app.options('/api/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

app.post('/api/broadcast', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ ok: false, error: 'Missing text' });

  let chatIds = [];
  try {
    const subResp = await fetch(SUPABASE_URL + '/rest/v1/bot_subscribers?is_active=eq.true&select=chat_id', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const subs = await subResp.json();
    chatIds = subs.map(s => Number(s.chat_id)).filter(Boolean);
  } catch (e) { console.error('Failed to fetch subscribers:', e); }

  try {
    const profResp = await fetch(SUPABASE_URL + '/rest/v1/profiles?telegram_id=not.is.null&select=telegram_id', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const profiles = await profResp.json();
    for (const p of profiles) { const tgId = Number(p.telegram_id); if (tgId && !chatIds.includes(tgId)) chatIds.push(tgId); }
  } catch (_) {}

  const replyMarkup = JSON.stringify({ inline_keyboard: [[{ text: 'Vidkryty VOLK 13:03', web_app: { url: WEBAPP_URL } }]] });
  let sent = 0, failed = 0;
  const blockedIds = [];

  for (const chatId of chatIds) {
    try {
      const r = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: replyMarkup }) });
      const result = await r.json();
      if (result.ok) sent++; else { failed++; if ((result.description || '').toLowerCase().includes('blocked') || result.error_code === 403) blockedIds.push(chatId); }
    } catch { failed++; }
    await new Promise(resolve => setTimeout(resolve, 60));
  }

  for (const blockedId of blockedIds) {
    try { await fetch(SUPABASE_URL + '/rest/v1/bot_subscribers?chat_id=eq.' + blockedId, { method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) }); } catch (_) {}
  }

  let channelOk = false;
  try {
    const chanResp = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHANNEL_ID, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: replyMarkup }) });
    channelOk = (await chanResp.json()).ok;
  } catch (_) {}

  return res.status(200).json({ ok: true, sent, failed, total: chatIds.length, channel: channelOk, blocked_marked: blockedIds.length });
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => { console.log('VOLK API server running on http://127.0.0.1:' + PORT); });
"@

# Write server.js via base64 to avoid escaping issues
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($serverJs))
Run-SSH "echo '$b64' | base64 -d > /var/www/volk1303/server.js"

# Install express
Run-SSH "cd /var/www/volk1303 && npm install express 2>&1 | tail -3"

# STEP 5: Setup bot
Write-Host ""
Write-Host "[5/8] Setting up Telegram bot..." -ForegroundColor Yellow

Run-SSH "mkdir -p /opt/bots/volki1303"
Run-SSH "cp /var/www/volk1303/bot/volki_bot.py /opt/bots/volki1303/"
Run-SSH "cp /var/www/volk1303/bot/admin_chat_ids.json /opt/bots/volki1303/"

# Update WEBAPP_URL in the bot script to use new domain
Run-SSH "sed -i 's|https://volk1303.vercel.app|https://volk1303.online|g' /opt/bots/volki1303/volki_bot.py"

# STEP 6: Create systemd services
Write-Host ""
Write-Host "[6/8] Creating systemd services..." -ForegroundColor Yellow

# Bot service
$botService = @"
[Unit]
Description=VOLKI 13:03 Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bots/volki1303
ExecStart=/usr/bin/python3 /opt/bots/volki1303/volki_bot.py
Restart=always
RestartSec=5
Environment=BOT_TOKEN=8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU
Environment=WEBAPP_URL=https://volk1303.online

[Install]
WantedBy=multi-user.target
"@
$b64svc = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($botService))
Run-SSH "echo '$b64svc' | base64 -d > /etc/systemd/system/volki-bot.service"

# API service
$apiService = @"
[Unit]
Description=VOLK 1303 API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/volk1303
ExecStart=/usr/bin/node /var/www/volk1303/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=BOT_TOKEN=8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU

[Install]
WantedBy=multi-user.target
"@
$b64api = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($apiService))
Run-SSH "echo '$b64api' | base64 -d > /etc/systemd/system/volk-api.service"

Run-SSH "systemctl daemon-reload"
Run-SSH "systemctl enable volki-bot volk-api"
Run-SSH "systemctl restart volk-api"
Run-SSH "systemctl restart volki-bot"

# STEP 7: Configure Nginx
Write-Host ""
Write-Host "[7/8] Configuring Nginx..." -ForegroundColor Yellow

$nginxConf = @'
server {
    listen 80;
    server_name volk1303.online www.volk1303.online;

    root /var/www/volk1303/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
'@
$b64ngx = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($nginxConf))
Run-SSH "echo '$b64ngx' | base64 -d > /etc/nginx/sites-available/volk1303"

Run-SSH "rm -f /etc/nginx/sites-enabled/default"
Run-SSH "ln -sf /etc/nginx/sites-available/volk1303 /etc/nginx/sites-enabled/volk1303"
Run-SSH "nginx -t"
Run-SSH "systemctl restart nginx"

# STEP 8: SSL Certificate
Write-Host ""
Write-Host "[8/8] Setting up SSL certificate..." -ForegroundColor Yellow

Run-SSH "certbot --nginx -d volk1303.online -d www.volk1303.online --non-interactive --agree-tos --email admin@volk1303.online --redirect 2>&1 | tail -15"

# VERIFY
Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan

Write-Host "Bot status:" -ForegroundColor Yellow
Run-SSH "systemctl status volki-bot --no-pager 2>&1 | head -10"

Write-Host "API status:" -ForegroundColor Yellow
Run-SSH "systemctl status volk-api --no-pager 2>&1 | head -10"

Write-Host "Nginx status:" -ForegroundColor Yellow
Run-SSH "systemctl status nginx --no-pager 2>&1 | head -5"

Write-Host "API health check:" -ForegroundColor Yellow
Run-SSH "curl -s http://127.0.0.1:3001/api/health"

Write-Host "Site check:" -ForegroundColor Yellow
Run-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost/"

# Cleanup
Remove-SSHSession -SessionId $sid | Out-Null

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "   Site: https://volk1303.online" -ForegroundColor Cyan
Write-Host "   Bot: systemctl status volki-bot" -ForegroundColor Cyan
Write-Host "   API: systemctl status volk-api" -ForegroundColor Cyan
