#!/usr/bin/env python3
"""
VOLKI 13:03 — Telegram Bot
Надсилає привітання, WebApp кнопку, список турнірів та автоматично
анонсує нові турніри, створені на сайті!

Підписники зберігаються у Supabase (таблиця bot_subscribers) —
не губляться при перезапуску бота!
"""

import os
import json
import logging
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

# Supabase credentials
SUPABASE_URL = "https://nbjnmzrjlvjbejgeogce.supabase.co"
SUPABASE_KEY = "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv"

# Fallback local file for announced tournament IDs
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

# ─── Supabase REST Helpers ───

def supabase_request(method: str, table: str, payload: dict = None, query: str = ""):
    """Generic Supabase REST API call"""
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    ctx = ssl.create_default_context()
    try:
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
        else:
            req = urllib.request.Request(url, headers=headers, method=method)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw.strip() else []
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log.error(f"Supabase HTTP error [{method} {table}]: {e.code} — {body}")
        return None
    except Exception as e:
        log.error(f"Supabase request error [{method} {table}]: {e}")
        return None

# ─── Subscriber Storage (Supabase Cloud) ───

def add_subscriber_to_db(chat_id: int, first_name: str, username: str):
    """Upsert a subscriber into Supabase bot_subscribers table"""
    data = {
        "chat_id": chat_id,
        "first_name": first_name,
        "username": username,
        "is_active": True
    }
    # Use upsert (INSERT ... ON CONFLICT DO UPDATE)
    url = f"{SUPABASE_URL}/rest/v1/bot_subscribers"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }
    ctx = ssl.create_default_context()
    try:
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            resp.read()
        log.info(f"Subscriber upserted to DB: {first_name} (chat_id={chat_id})")
        return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log.warning(f"Could not upsert subscriber to DB (table may not exist yet?): {e.code} — {err_body}")
        return False
    except Exception as e:
        log.warning(f"Could not upsert subscriber to DB: {e}")
        return False

def mark_subscriber_inactive(chat_id: int):
    """Mark a subscriber as inactive (they blocked the bot)"""
    url = f"{SUPABASE_URL}/rest/v1/bot_subscribers?chat_id=eq.{chat_id}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    ctx = ssl.create_default_context()
    try:
        body = json.dumps({"is_active": False}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            resp.read()
    except Exception as e:
        log.warning(f"Could not mark subscriber {chat_id} inactive: {e}")

def fetch_all_subscribers():
    """
    Get all active subscribers from Supabase.
    Falls back to profiles table where telegram_id is set.
    Returns list of chat_ids (integers).
    """
    chat_ids = set()

    # Primary: bot_subscribers table
    url = f"{SUPABASE_URL}/rest/v1/bot_subscribers?is_active=eq.true&select=chat_id"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            for row in rows:
                try:
                    chat_ids.add(int(row["chat_id"]))
                except (KeyError, ValueError):
                    pass
        log.info(f"Loaded {len(chat_ids)} subscribers from bot_subscribers table")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log.warning(f"Could not load bot_subscribers (table may not exist): {e.code} — {err_body}")
    except Exception as e:
        log.warning(f"Could not load bot_subscribers: {e}")

    # Secondary fallback: profiles with telegram_id set
    try:
        url2 = f"{SUPABASE_URL}/rest/v1/profiles?telegram_id=not.is.null&select=telegram_id"
        req2 = urllib.request.Request(url2, headers=headers)
        with urllib.request.urlopen(req2, context=ctx, timeout=15) as resp:
            rows2 = json.loads(resp.read().decode("utf-8"))
            for row in rows2:
                tg_id = row.get("telegram_id")
                if tg_id:
                    try:
                        chat_ids.add(int(tg_id))
                    except (ValueError, TypeError):
                        pass
        log.info(f"Total after merging with profiles fallback: {len(chat_ids)} unique subscribers")
    except Exception as e:
        log.warning(f"Could not load profiles fallback: {e}")

    return list(chat_ids)

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
        f"💰 <b>Призовий фонд:</b> {t.get('prize_pool', '0')}\n"
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
    username = message["from"].get("username", "")
    text = message.get("text", "")
    
    # Auto-subscribe every user who writes to the bot
    add_subscriber_to_db(chat_id, first_name, username)
    
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
        for t in active_tourneys[:3]:  # Max 3 latest for readable output
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
    
    # Load previously announced tournament IDs (from local file)
    announced_ids = set(load_json(ANNOUNCED_FILE, []))
    
    # Initial load: do not announce existing tournaments on startup
    initial_tourneys = fetch_tournaments_from_db()
    if initial_tourneys:
        for t in initial_tourneys:
            announced_ids.add(t["id"])
        save_json(ANNOUNCED_FILE, list(announced_ids))
        log.info(f"Initialized with {len(announced_ids)} existing tournament IDs (will not re-announce these).")
    
    while True:
        try:
            # Poll tournaments every 15 seconds
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
                    
                    # ─── Send to all bot subscribers from Supabase ───
                    all_chat_ids = fetch_all_subscribers()
                    sub_count = 0
                    blocked_count = 0
                    
                    log.info(f"Broadcasting to {len(all_chat_ids)} subscribers...")
                    
                    for chat_id in all_chat_ids:
                        try:
                            result = tg_request("sendMessage", {
                                "chat_id": chat_id,
                                "text": announcement,
                                "parse_mode": "HTML",
                                "reply_markup": inline_keyboard
                            })
                            if result and result.get("ok"):
                                sub_count += 1
                            else:
                                # Failed — check if it's a "blocked by user" error
                                err_desc = result.get("description", "") if result else ""
                                if "blocked" in err_desc.lower() or "chat not found" in err_desc.lower() or "forbidden" in err_desc.lower():
                                    log.warning(f"Subscriber {chat_id} has blocked the bot — marking inactive")
                                    mark_subscriber_inactive(chat_id)
                                    blocked_count += 1
                                else:
                                    log.warning(f"Failed to send to {chat_id}: {err_desc}")
                            time.sleep(0.05)  # Prevent Telegram rate limiting
                        except Exception as ex:
                            log.error(f"Could not send announcement to subscriber {chat_id}: {ex}")
                    
                    log.info(f"Broadcast complete: ✅ {sub_count} sent, ❌ {blocked_count} blocked")
                    
                    # ─── Also post to channel ───
                    channel_id = os.environ.get("TELEGRAM_CHANNEL", "@volki1303")
                    try:
                        channel_result = tg_request("sendMessage", {
                            "chat_id": channel_id,
                            "text": announcement,
                            "parse_mode": "HTML",
                            "reply_markup": inline_keyboard
                        })
                        if channel_result and channel_result.get("ok"):
                            log.info(f"✅ Successfully posted tournament announcement to channel {channel_id}")
                        else:
                            err = channel_result.get("description", "unknown error") if channel_result else "no response"
                            log.warning(f"Could not post to channel {channel_id}: {err}")
                    except Exception as ex:
                        log.warning(f"Could not post announcement to channel {channel_id}: {ex}")
                        
                    # Save ID to avoid duplicates
                    announced_ids.add(t["id"])
                    save_json(ANNOUNCED_FILE, list(announced_ids))
                    
        except Exception as e:
            log.error(f"Error in background monitor loop: {e}")
            
        time.sleep(15)  # Poll database every 15 seconds

# ─── Polling Mode ───

def run_polling():
    """Long-polling mode for the bot"""
    log.info(f"Starting VOLKI bot in POLLING mode...")
    log.info(f"WebApp URL: {WEBAPP_URL}")
    log.info(f"Supabase URL: {SUPABASE_URL}")
    
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
    
    log.info("🐺 VOLKI bot is fully running! Listening for messages...")
    
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
            time.sleep(5)


if __name__ == "__main__":
    run_polling()
