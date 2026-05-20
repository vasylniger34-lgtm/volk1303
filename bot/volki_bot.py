#!/usr/bin/env python3
"""
VOLKI 13:03 — Telegram Bot
Надсилає привітання, WebApp кнопку, список турнірів та автоматично
анонсує нові турніри, створені на сайті!
"""

import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import ssl
import sys
import threading
import time

# ─── Config ───
BOT_TOKEN = os.environ.get("BOT_TOKEN", "8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://volk1303.vercel.app")
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

# Credentials for Supabase
SUPABASE_URL = "https://nbjnmzrjlvjbejgeogce.supabase.co"
SUPABASE_KEY = "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv"

# Files for persistence
SUBSCRIBERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "subscribed_users.json")
ANNOUNCED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "announced_tournaments.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [VOLKI-BOT] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("volki-bot")

# ─── JSON Helpers ───

def load_json(filepath, default_val):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.error(f"Error loading JSON from {filepath}: {e}")
    return default_val

def save_json(filepath, data):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log.error(f"Error saving JSON to {filepath}: {e}")

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

# ─── Supabase Data Fetchers ───

def fetch_tournaments_from_db():
    """Fetch all tournaments from Supabase database ordered by creation time"""
    url = f"{SUPABASE_URL}/rest/v1/tournaments?select=*&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log.error(f"Error fetching tournaments from Supabase: {e}")
        return None

# ─── Formatter ───

def format_tournament(t: dict) -> str:
    """Format tournament details into a premium Telegram message"""
    tourney_name = t.get("name", "Без назви").upper()
    
    # Emoji mappings for tournament types
    tourney_type = t.get("type", "2X2")
    type_emoji = "⚔️"
    if tourney_type == "2X2":
        type_emoji = "👥 2x2"
    elif tourney_type == "4X4":
        type_emoji = "🐺 4x4"
    elif tourney_type == "BCI":
        type_emoji = "🏆 BCI"

    status_str = "⌛ Очікування"
    status = t.get("status", "upcoming")
    if status == "active":
        status_str = "🔥 Активний"
    elif status == "completed":
        status_str = "🏁 Завершений"

    # Process rules list
    rules_text = ""
    rules = t.get("rules", [])
    if rules:
        if isinstance(rules, str):
            rules = [rules]
        rules_text = "\n📋 <b>Правила:</b>\n" + "\n".join(f"  • {r}" for r in rules[:3])
        if len(rules) > 3:
            rules_text += "\n  • ..."

    msg = (
        f"🏆 <b>Турнір: {tourney_name}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📅 <b>Дата:</b> {t.get('date', 'Не вказано')}\n"
        f"⚡ <b>Формат:</b> {type_emoji} ({t.get('system', 'Single Elimination')})\n"
        f"🗺️ <b>Карта:</b> <code>{t.get('map', 'Невідомо')}</code>\n"
        f"💰 <b>Призовий фонд:</b> 🪙 {t.get('prize_pool', '0 🪙')}\n"
        f"👥 <b>Команди:</b> {t.get('participants_count', 0)} / {t.get('max_participants', 16)}\n"
        f"📊 <b>Статус:</b> {status_str}\n"
        f"{rules_text}"
    )
    return msg

# ─── Welcome and Interactive Messages ───

def send_welcome(chat_id: int, first_name: str = "Гравець"):
    """Send welcome message with WebApp button and a reply keyboard"""
    text = (
        f"🐺 <b>Вітаємо, {first_name}!</b>\n\n"
        f"Ласкаво просимо до <b>VOLKI 13:03</b> — "
        f"елітної турнірної платформи для кіберспорту CS2.\n\n"
        f"🎮 Турніри 2x2 та 4x4\n"
        f"🏆 Величезні призові пули\n"
        f"📊 LIVE ставки на матчі віртуальними монетами\n"
        f"⚡ Рівні гравців, статистика та XP рейтинг\n\n"
        f"Натискай кнопку <b>Відкрити VOLKI</b> нижче, щоб увірватися в гру! 👇"
    )
    
    # Persistent keyboard at the bottom
    reply_keyboard = {
        "keyboard": [
            [{"text": "🎮 Відкрити VOLKI 13:03", "web_app": {"url": WEBAPP_URL}}],
            [{"text": "🏆 Активні турніри"}, {"text": "📱 Наш канал"}]
        ],
        "resize_keyboard": True
    }
    
    return tg_request("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": reply_keyboard
    })

# ─── Update Handler ───

def handle_update(update: dict):
    """Process incoming Telegram update"""
    if "message" not in update:
        return
    
    message = update["message"]
    chat_id = message["chat"]["id"]
    first_name = message["from"].get("first_name", "Гравець")
    text = message.get("text", "")
    
    # Save/Subscribe user
    chat_id_str = str(chat_id)
    subscribers = load_json(SUBSCRIBERS_FILE, {})
    if chat_id_str not in subscribers:
        subscribers[chat_id_str] = {
            "first_name": first_name,
            "username": message["from"].get("username", ""),
            "subscribed_at": time.time()
        }
        save_json(SUBSCRIBERS_FILE, subscribers)
        log.info(f"New subscriber registered: {first_name} (chat_id={chat_id_str})")
    
    if text == "/start":
        send_welcome(chat_id, first_name)
    elif text == "/help":
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": (
                "🐺 <b>VOLKI 13:03 — Довідка по командах</b>\n\n"
                "• Натисніть кнопку <b>Відкрити VOLKI</b> для входу в додаток\n"
                "• <b>🏆 Активні турніри</b> — перегляд списку турнірів\n"
                "• <b>📱 Наш канал</b> — перехід до нашого Telegram-каналу\n\n"
                "З будь-яких питань пишіть менеджерам у нашому каналі!"
            ),
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [[{
                    "text": "🎮 Відкрити VOLKI",
                    "web_app": {"url": WEBAPP_URL}
                }]]
            }
        })
    elif text == "🏆 Активні турніри" or text == "/tournaments":
        tourneys = fetch_tournaments_from_db()
        if tourneys is None:
            tg_request("sendMessage", {
                "chat_id": chat_id,
                "text": "❌ <b>Не вдалося зв'язатися з базою даних.</b> Спробуйте пізніше або зверніться до підтримки.",
                "parse_mode": "HTML"
            })
            return
        
        # Filter active and upcoming tournaments
        active_tourneys = [t for t in tourneys if t.get("status") in ("upcoming", "active")]
        
        if not active_tourneys:
            tg_request("sendMessage", {
                "chat_id": chat_id,
                "text": "🐺 <b>Наразі немає активних або запланованих турнірів.</b>\n\nСлідкуйте за оновленнями або створіть новий турнір через Панель Керування на сайті! ⚔️",
                "parse_mode": "HTML"
            })
            return
            
        # Format list
        response_text = f"🐺 <b>АКТИВНІ ТУРНІРИ VOLKI 13:03:</b>\n\n"
        for t in active_tourneys[:3]: # Max 3 latest for readable output
            response_text += format_tournament(t) + "\n\n"
        
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": response_text,
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [[
                    {
                        "text": "🎮 Відкрити додаток",
                        "web_app": {"url": WEBAPP_URL}
                    }
                ]]
            }
        })
    elif text == "📱 Наш канал":
        tg_request("sendMessage", {
            "chat_id": chat_id,
            "text": "📱 Приєднуйтесь до нашого офіційного каналу, щоб не пропустити важливі новини, розіграші та стріми матчів!",
            "reply_markup": {
                "inline_keyboard": [[{
                    "text": "🐺 Наш канал",
                    "url": "https://t.me/volki1303"
                }]]
            }
        })
    else:
        # Any other message — show welcome (keeps bot responsive)
        send_welcome(chat_id, first_name)


# ─── Background Supabase Sync Thread ───

def monitor_new_tournaments():
    """Background loop that polls Supabase and broadcasts new tournaments"""
    log.info("Background Supabase Tournament Monitor thread started successfully!")
    
    # Load previously announced tournament IDs
    announced_ids = set(load_json(ANNOUNCED_FILE, []))
    
    # Initial load: do not announce existing tournaments on startup
    initial_tourneys = fetch_tournaments_from_db()
    if initial_tourneys:
        for t in initial_tourneys:
            announced_ids.add(t["id"])
        save_json(ANNOUNCED_FILE, list(announced_ids))
        log.info(f"Initialized with {len(announced_ids)} existing tournament IDs.")
    
    while True:
        try:
            # Poll tournaments
            tourneys = fetch_tournaments_from_db()
            if tourneys:
                # Find which tournaments are NOT announced yet
                new_tourneys = [t for t in tourneys if t["id"] not in announced_ids]
                
                # Announce oldest first
                for t in reversed(new_tourneys):
                    tourney_name = t.get("name", "Без назви")
                    log.info(f"🎉 New tournament detected in DB: {tourney_name} (ID: {t['id']})")
                    
                    # Beautiful custom announcement
                    announcement = (
                        f"🚨 <b>АНОНС НОВОГО ТУРНІРУ!</b> 🚨\n\n"
                        f"{format_tournament(t)}\n"
                        f"🔥 <b>Реєстрація відкрита!</b> Заходь у додаток та подавай заявку зі своєю командою прямо зараз! 👇"
                    )
                    
                    inline_keyboard = {
                        "inline_keyboard": [
                            [
                                {
                                    "text": "🎮 Реєстрація / Грати",
                                    "web_app": {"url": WEBAPP_URL}
                                }
                            ]
                        ]
                    }
                    
                    # Send to all bot subscribers
                    subscribers = load_json(SUBSCRIBERS_FILE, {})
                    sub_count = 0
                    for chat_id_str in list(subscribers.keys()):
                        try:
                            tg_request("sendMessage", {
                                "chat_id": int(chat_id_str),
                                "text": announcement,
                                "parse_mode": "HTML",
                                "reply_markup": inline_keyboard
                            })
                            sub_count += 1
                            time.sleep(0.05) # Prevent spamming limits
                        except Exception as ex:
                            log.error(f"Could not send announcement to subscriber {chat_id_str}: {ex}")
                    
                    log.info(f"Successfully broadcasted to {sub_count} subscribers.")
                    
                    # Send to channel
                    channel_id = os.environ.get("TELEGRAM_CHANNEL", "@volki1303")
                    try:
                        tg_request("sendMessage", {
                            "chat_id": channel_id,
                            "text": announcement,
                            "parse_mode": "HTML",
                            "reply_markup": inline_keyboard
                        })
                        log.info(f"Successfully posted tournament announcement to channel {channel_id}")
                    except Exception as ex:
                        log.warning(f"Could not post announcement to channel {channel_id} (make sure the bot is an admin there): {ex}")
                        
                    # Save ID to avoid duplicates
                    announced_ids.add(t["id"])
                    save_json(ANNOUNCED_FILE, list(announced_ids))
                    
        except Exception as e:
            log.error(f"Error in background monitor loop: {e}")
            
        time.sleep(15) # Poll database every 15 seconds

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
    
    # Start the background sync monitor thread
    monitor_thread = threading.Thread(target=monitor_new_tournaments, daemon=True)
    monitor_thread.start()
    
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
