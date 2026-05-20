#!/usr/bin/env python3
"""
VOLKI 13:03 — Telegram Bot
Відправляє привітання та кнопку WebApp при команді /start
"""

import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import ssl
import sys

# ─── Config ───
BOT_TOKEN = os.environ.get("BOT_TOKEN", "8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://volk1303.vercel.app")
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [VOLKI-BOT] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("volki-bot")

# ─── Telegram API Helpers ───

def tg_request(method: str, data: dict = None):
    """Make a request to Telegram Bot API"""
    url = f"{API_URL}/{method}"
    try:
        if data:
            payload = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        else:
            req = urllib.request.Request(url)
        
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log.error(f"Telegram API error [{method}]: {e}")
        return None


def send_welcome(chat_id: int, first_name: str = "Гравець"):
    """Send welcome message with WebApp button"""
    text = (
        f"🐺 <b>Вітаємо, {first_name}!</b>\n\n"
        f"Ласкаво просимо до <b>VOLKI 13:03</b> — "
        f"турнірної платформи для кіберспорту CS2.\n\n"
        f"🎮 Турніри 2x2 та 4x4\n"
        f"🏆 Призові пули\n"
        f"📊 LIVE ставки на матчі\n"
        f"⚡ Рейтинг та рівні\n\n"
        f"Натисни кнопку нижче, щоб відкрити платформу 👇"
    )
    
    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "🎮 Відкрити VOLKI 13:03",
                    "web_app": {"url": WEBAPP_URL}
                }
            ],
            [
                {
                    "text": "📱 Наш канал",
                    "url": "https://t.me/volki1303"
                }
            ]
        ]
    }
    
    return tg_request("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": keyboard
    })


def handle_update(update: dict):
    """Process incoming Telegram update"""
    if "message" not in update:
        return
    
    message = update["message"]
    chat_id = message["chat"]["id"]
    first_name = message["from"].get("first_name", "Гравець")
    text = message.get("text", "")
    
    if text == "/start":
        log.info(f"New user: {first_name} (chat_id={chat_id})")
        send_welcome(chat_id, first_name)
    elif text == "/help":
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": (
                "🐺 <b>VOLKI 13:03 — Довідка</b>\n\n"
                "/start — Відкрити платформу\n"
                "/help — Ця довідка\n\n"
                "Натисни кнопку нижче для входу 👇"
            ),
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [[{
                    "text": "🎮 Відкрити VOLKI",
                    "web_app": {"url": WEBAPP_URL}
                }]]
            }
        })
    else:
        # Any other message — show welcome
        send_welcome(chat_id, first_name)


# ─── Polling Mode ───

def run_polling():
    """Long-polling mode for the bot"""
    log.info(f"Starting VOLKI bot in POLLING mode...")
    log.info(f"WebApp URL: {WEBAPP_URL}")
    
    # Verify bot token
    me = tg_request("getMe")
    if not me or not me.get("ok"):
        log.error("Invalid bot token! Check BOT_TOKEN.")
        sys.exit(1)
    
    bot_name = me["result"]["username"]
    log.info(f"Bot connected: @{bot_name}")
    
    # Delete any existing webhook
    tg_request("deleteWebhook", {"drop_pending_updates": True})
    
    offset = 0
    while True:
        try:
            updates = tg_request("getUpdates", {
                "offset": offset,
                "timeout": 30,
                "allowed_updates": ["message"]
            })
            
            if updates and updates.get("ok"):
                for update in updates["result"]:
                    offset = update["update_id"] + 1
                    try:
                        handle_update(update)
                    except Exception as e:
                        log.error(f"Error processing update: {e}")
        except KeyboardInterrupt:
            log.info("Bot stopped by user")
            break
        except Exception as e:
            log.error(f"Polling error: {e}")
            import time
            time.sleep(5)


if __name__ == "__main__":
    run_polling()
