#!/usr/bin/env python3
"""
VOLKI 13:03 — Telegram Bot
Надсилає привітання, WebApp кнопку, список турнірів та автоматично
анонсує нові турніри, створені на сайті!

Підписники зберігаються у Supabase (таблиця bot_subscribers) —
не губляться при перезапуску бота!

АДМІН-ФУНКЦІЇ (тільки для адмінів):
  /broadcast <текст>   — Розсилка повідомлення всім підписникам
  /stats               — Статистика підписників
  /admins              — Список адмін-чатів
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

# ─── ADMIN CHAT IDs ───────────────────────────────────────────────────────────
# Це список Telegram chat_id які мають доступ до адмін-команд.
# Щоб дізнатися свій chat_id — напишіть /myid боту.
# Зберігаємо також у файлі для зручності (admin_chat_ids.json).
ADMIN_IDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin_chat_ids.json")
# ─────────────────────────────────────────────────────────────────────────────

# Fallback local file for announced tournament IDs
ANNOUNCED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "announced_tournaments.json")

# State for multi-step broadcast
pending_broadcasts = {}  # chat_id -> {"step": "waiting_text", "preview": str}

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

# ─── Admin ID Management ───

def load_admin_ids() -> set:
    """Load admin chat IDs from file + env variable"""
    ids = set()
    # From file
    file_ids = load_json(ADMIN_IDS_FILE, [])
    for i in file_ids:
        try:
            ids.add(int(i))
        except (ValueError, TypeError):
            pass
    # From env variable (comma separated)
    env_ids = os.environ.get("ADMIN_CHAT_IDS", "")
    for i in env_ids.split(","):
        i = i.strip()
        if i:
            try:
                ids.add(int(i))
            except ValueError:
                pass
    return ids

def save_admin_id(chat_id: int):
    """Add a new admin ID to the file"""
    current = set(load_json(ADMIN_IDS_FILE, []))
    current.add(chat_id)
    save_json(ADMIN_IDS_FILE, list(current))

def is_admin(chat_id: int) -> bool:
    if chat_id in load_admin_ids():
        return True
    
    # Check dynamically in Supabase profiles
    try:
        # Check if user has telegram_id equal to chat_id and role equal to 'admin'
        rows = supabase_request("GET", "profiles", query=f"?telegram_id=eq.{chat_id}&role=eq.admin&select=id")
        if rows and len(rows) > 0:
            log.info(f"Dynamic admin detected in Supabase profiles: chat_id={chat_id}")
            save_admin_id(chat_id)
            return True
    except Exception as e:
        log.warning(f"Error checking dynamic admin in Supabase: {e}")
        
    return False


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

def send_msg(chat_id: int, text: str, parse_mode="HTML", reply_markup=None, disable_preview=True):
    """Shortcut to send a message"""
    data = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_preview
    }
    if reply_markup:
        data["reply_markup"] = reply_markup
    return tg_request("sendMessage", data)

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
    """Upsert a subscriber into Supabase bot_subscribers table and register in profiles via RPC"""
    data = {
        "chat_id": chat_id,
        "first_name": first_name,
        "username": username,
        "is_active": True
    }
    url = f"{SUPABASE_URL}/rest/v1/bot_subscribers"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }
    ctx = ssl.create_default_context()
    
    # 1. Upsert bot_subscribers table
    try:
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            resp.read()
        log.info(f"Subscriber upserted to DB: {first_name} (chat_id={chat_id})")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log.warning(f"Could not upsert subscriber to DB: {e.code} — {err_body}")
    except Exception as e:
        log.warning(f"Could not upsert subscriber to DB: {e}")

    # 2. Register/Sync in auth.users and public.profiles via RPC
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/register_telegram_user"
    rpc_payload = {
        "tg_id": str(chat_id),
        "tg_username": username or f"user_{chat_id}",
        "tg_first_name": first_name or "Гравець"
    }
    try:
        body = json.dumps(rpc_payload).encode("utf-8")
        req = urllib.request.Request(rpc_url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            resp.read()
        log.info(f"User profile registered/synced via RPC: {username} ({chat_id})")
        return True
    except Exception as e:
        log.warning(f"Could not register user profile via RPC: {e}")
        if hasattr(e, 'read'):
            log.warning(f"Response: {e.read().decode('utf-8')}")
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
        log.warning(f"Could not load bot_subscribers: {e.code} — {err_body}")
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
        log.info(f"Total subscribers after fallback merge: {len(chat_ids)}")
    except Exception as e:
        log.warning(f"Could not load profiles fallback: {e}")

    return list(chat_ids)

def fetch_subscribers_count() -> tuple:
    """Returns (bot_subscribers_count, profiles_with_tg_count)"""
    bot_count = 0
    profile_count = 0
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Prefer": "count=exact"}
    ctx = ssl.create_default_context()
    try:
        url = f"{SUPABASE_URL}/rest/v1/bot_subscribers?is_active=eq.true&select=chat_id"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            bot_count = len(rows)
    except:
        pass
    try:
        url2 = f"{SUPABASE_URL}/rest/v1/profiles?select=id"
        req2 = urllib.request.Request(url2, headers=headers)
        with urllib.request.urlopen(req2, context=ctx, timeout=10) as resp:
            rows2 = json.loads(resp.read().decode("utf-8"))
            profile_count = len(rows2)
    except:
        pass
    return bot_count, profile_count

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
    
    tourney_type = t.get("type", "2X2")
    type_emoji = "⚔️"
    if tourney_type == "2X2":
        type_emoji = "👥 2x2"
    elif tourney_type == "3X3":
        type_emoji = "🎯 3x3"
    elif tourney_type == "4X4":
        type_emoji = "🐺 4x4"
    elif tourney_type == "5X5":
        type_emoji = "👑 5x5"
    elif tourney_type == "BCI":
        type_emoji = "🏆 BCI"

    status_str = "⌛ Очікування"
    status = t.get("status", "upcoming")
    if status == "active":
        status_str = "🔥 Активний"
    elif status == "completed":
        status_str = "🏁 Завершений"

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

# ─── Broadcast Sender ───

def do_broadcast(text: str, sender_chat_id: int = None) -> tuple:
    """
    Send a broadcast message to ALL active subscribers.
    Returns (sent_count, failed_count).
    """
    all_chat_ids = fetch_all_subscribers()
    sent = 0
    failed = 0
    
    inline_kb = {
        "inline_keyboard": [[{
            "text": "🎮 Відкрити VOLKI 13:03",
            "web_app": {"url": WEBAPP_URL}
        }]]
    }
    
    log.info(f"Starting broadcast to {len(all_chat_ids)} subscribers...")
    
    for chat_id in all_chat_ids:
        try:
            result = tg_request("sendMessage", {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
                "reply_markup": inline_kb
            })
            if result and result.get("ok"):
                sent += 1
            else:
                err_desc = result.get("description", "") if result else ""
                if any(word in err_desc.lower() for word in ["blocked", "chat not found", "forbidden", "deactivated"]):
                    mark_subscriber_inactive(chat_id)
                    log.warning(f"Subscriber {chat_id} blocked bot — marked inactive")
                failed += 1
            time.sleep(0.05)  # Rate limit protection
        except Exception as ex:
            log.error(f"Broadcast error for {chat_id}: {ex}")
            failed += 1
    
    # Also post to channel
    channel_id = os.environ.get("TELEGRAM_CHANNEL", "@volki1303")
    try:
        ch_result = tg_request("sendMessage", {
            "chat_id": channel_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "reply_markup": inline_kb
        })
        if ch_result and ch_result.get("ok"):
            log.info(f"✅ Also posted to channel {channel_id}")
    except Exception as ex:
        log.warning(f"Could not post to channel: {ex}")
    
    log.info(f"Broadcast complete: ✅ {sent} sent, ❌ {failed} failed")
    return sent, failed

# ─── Admin Menu Keyboards ───

def admin_main_menu():
    return {
        "keyboard": [
            [{"text": "📢 Зробити розсилку"}],
            [{"text": "📊 Статистика підписників"}, {"text": "👥 Список адмінів"}],
            [{"text": "🏆 Активні турніри"}, {"text": "🎮 Відкрити VOLKI", "web_app": {"url": WEBAPP_URL}}],
            [{"text": "⬅️ Головне меню"}]
        ],
        "resize_keyboard": True
    }

def main_menu():
    return {
        "keyboard": [
            [{"text": "🎮 Відкрити VOLKI 13:03", "web_app": {"url": WEBAPP_URL}}],
            [{"text": "🏆 Активні турніри"}, {"text": "📱 Наш канал"}]
        ],
        "resize_keyboard": True
    }

def broadcast_templates_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "🏆 Шаблон: Новий турнір", "callback_data": "tmpl_tournament"}],
            [{"text": "⚙️ Шаблон: Тех. роботи", "callback_data": "tmpl_maintenance"}],
            [{"text": "🎉 Шаблон: Результати турніру", "callback_data": "tmpl_results"}],
            [{"text": "✍️ Написати своє", "callback_data": "tmpl_custom"}],
            [{"text": "❌ Скасувати", "callback_data": "broadcast_cancel"}]
        ]
    }

BROADCAST_TEMPLATES = {
    "tmpl_tournament": (
        "🚨 <b>АНОНС ТУРНІРУ!</b>\n\n"
        "🏆 Незабаром відбудеться новий турнір VOLKI 1303!\n"
        "📅 Дата: [ВКАЖІТЬ ДАТУ]\n"
        "💰 Призовий фонд: [ВКАЖІТЬ ФОНД]\n"
        "🗺️ Карта: [ВКАЖІТЬ КАРТУ]\n\n"
        "Реєструйся зараз у додатку! 👇\n#volki1303"
    ),
    "tmpl_maintenance": (
        "⚙️ <b>Технічні роботи</b>\n\n"
        "Платформа VOLKI 1303 тимчасово недоступна для профілактичних робіт.\n"
        "Очікуваний час відновлення: [ЧАС]\n\n"
        "Дякуємо за розуміння! 🐺\n#volki1303"
    ),
    "tmpl_results": (
        "🎉 <b>РЕЗУЛЬТАТИ ТУРНІРУ!</b>\n\n"
        "🥇 Переможець: [КОМАНДА]\n"
        "🥈 2-е місце: [КОМАНДА]\n"
        "🥉 3-є місце: [КОМАНДА]\n\n"
        "Вітаємо всіх учасників! 🏆\n#volki1303"
    )
}

# ─── Welcome and Interactive Messages ───

def send_welcome(chat_id: int, first_name: str = "Гравець"):
    """Send welcome message with WebApp button and a reply keyboard"""
    text = (
        f"🐺 <b>Вітаємо, {first_name}!</b>\n\n"
        f"Ласкаво просимо до <b>VOLKI 13:03</b> — "
        f"елітної турнірної платформи для кіберспорту CS2.\n\n"
        f"🎮 Турніри 2x2, 3x3, 4x4 та 5x5\n"
        f"🏆 Величезні призові пули\n"
        f"📊 LIVE ставки на матчі віртуальними монетами\n"
        f"⚡ Рівні гравців, статистика та XP рейтинг\n\n"
        f"Натискай кнопку <b>Відкрити VOLKI</b> нижче, щоб увірватися в гру! 👇"
    )
    
    return tg_request("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": main_menu()
    })

# ─── Update Handler ───

def handle_callback_query(update: dict):
    """Handle inline keyboard button clicks"""
    cq = update.get("callback_query")
    if not cq:
        return
    
    chat_id = cq["from"]["id"]
    first_name = cq["from"].get("first_name", "Адмін")
    data = cq.get("data", "")
    message_id = cq["message"]["message_id"]
    
    # Always answer the callback query to remove loading indicator
    tg_request("answerCallbackQuery", {"callback_query_id": cq["id"]})
    
    if not is_admin(chat_id):
        send_msg(chat_id, "⛔ У вас немає прав для цієї дії.")
        return
    
    if data == "broadcast_cancel":
        pending_broadcasts.pop(chat_id, None)
        tg_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": "❌ Розсилку скасовано.",
            "parse_mode": "HTML"
        })
        send_msg(chat_id, "↩️ Повернення до адмін-меню.", reply_markup=admin_main_menu())
        return
    
    if data in BROADCAST_TEMPLATES:
        template_text = BROADCAST_TEMPLATES[data]
        pending_broadcasts[chat_id] = {"step": "confirm", "text": template_text}
        
        preview = f"📋 <b>Прев'ю повідомлення:</b>\n\n{template_text}\n\n─────────────────────\n⚠️ Надіслати це повідомлення <b>всім підписникам</b>?"
        tg_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": preview,
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "✅ Так, надіслати всім!", "callback_data": "broadcast_confirm"}],
                    [{"text": "✏️ Редагувати текст", "callback_data": "broadcast_edit"}],
                    [{"text": "❌ Скасувати", "callback_data": "broadcast_cancel"}]
                ]
            }
        })
        return
    
    if data == "tmpl_custom":
        pending_broadcasts[chat_id] = {"step": "waiting_text"}
        tg_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": (
                "✍️ <b>Введіть текст розсилки:</b>\n\n"
                "Підтримується HTML форматування:\n"
                "• <code>&lt;b&gt;жирний&lt;/b&gt;</code>\n"
                "• <code>&lt;i&gt;курсив&lt;/i&gt;</code>\n"
                "• <code>&lt;code&gt;код&lt;/code&gt;</code>\n\n"
                "Просто напишіть наступне повідомлення 👇"
            ),
            "parse_mode": "HTML"
        })
        return
    
    if data == "broadcast_edit":
        pending_broadcasts[chat_id] = {"step": "waiting_text"}
        send_msg(chat_id, "✍️ Введіть новий текст розсилки (HTML підтримується):")
        return
    
    if data == "broadcast_confirm":
        state = pending_broadcasts.get(chat_id, {})
        broadcast_text = state.get("text", "")
        if not broadcast_text:
            send_msg(chat_id, "❌ Текст розсилки порожній. Почніть спочатку.")
            return
        
        pending_broadcasts.pop(chat_id, None)
        
        # Send progress notification
        tg_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": "⏳ <b>Розсилку запущено...</b>\n\nЗачекайте, йде надсилання всім підписникам.",
            "parse_mode": "HTML"
        })
        
        # Run in background thread so bot doesn't freeze
        def run_broadcast():
            sent, failed = do_broadcast(broadcast_text, sender_chat_id=chat_id)
            send_msg(
                chat_id,
                f"✅ <b>Розсилку завершено!</b>\n\n"
                f"📤 Надіслано: <b>{sent}</b> підписників\n"
                f"❌ Помилок: <b>{failed}</b>\n\n"
                f"Повідомлення також опубліковано в каналі @volki1303",
                reply_markup=admin_main_menu()
            )
        
        threading.Thread(target=run_broadcast, daemon=True).start()
        return

    # ─── Invite Handlers ───
    if data.startswith("invite_accept_"):
        invite_id = data.replace("invite_accept_", "")
        res = supabase_request("POST", "rpc/accept_team_invite", payload={"p_invite_id": invite_id})
        if res and isinstance(res, dict) and res.get("ok"):
            tg_request("editMessageText", {
                "chat_id": chat_id,
                "message_id": message_id,
                "text": f"✅ Ви успішно приєдналися до команди <b>{res.get('team_name', '')}</b>!",
                "parse_mode": "HTML"
            })
        else:
            tg_request("answerCallbackQuery", {"callback_query_id": cq["id"], "text": "Помилка! Можливо, запрошення вже недійсне.", "show_alert": True})
            tg_request("editMessageText", {
                "chat_id": chat_id,
                "message_id": message_id,
                "text": "❌ Запрошення недійсне або вже оброблене.",
                "parse_mode": "HTML"
            })
        return

    if data.startswith("invite_decline_"):
        invite_id = data.replace("invite_decline_", "")
        supabase_request("POST", "rpc/decline_team_invite", payload={"p_invite_id": invite_id})
        tg_request("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": "❌ Ви відхилили запрошення.",
            "parse_mode": "HTML"
        })
        return

def handle_update(update: dict):
    """Process incoming Telegram update"""
    # Handle callback queries (inline button clicks)
    if "callback_query" in update:
        handle_callback_query(update)
        return
    
    if "message" not in update:
        return
    
    message = update["message"]
    chat_id = message["chat"]["id"]
    first_name = message["from"].get("first_name", "Гравець")
    username = message["from"].get("username", "")
    text = message.get("text", "").strip()
    
    # Auto-subscribe every user who writes to the bot
    add_subscriber_to_db(chat_id, first_name, username)
    
    # ─── Check if we're in a pending broadcast state ───
    state = pending_broadcasts.get(chat_id)
    if state and state.get("step") == "waiting_text" and text and not text.startswith("/"):
        # User is typing their broadcast message
        pending_broadcasts[chat_id] = {"step": "confirm", "text": text}
        preview = f"📋 <b>Прев'ю повідомлення:</b>\n\n{text}\n\n─────────────────────\n⚠️ Надіслати це повідомлення <b>всім підписникам</b>?"
        send_msg(chat_id, preview, reply_markup={
            "inline_keyboard": [
                [{"text": "✅ Так, надіслати всім!", "callback_data": "broadcast_confirm"}],
                [{"text": "✏️ Редагувати", "callback_data": "broadcast_edit"}],
                [{"text": "❌ Скасувати", "callback_data": "broadcast_cancel"}]
            ]
        })
        return
    
    # ─── Command handlers ───
    
    if text == "/start":
        if is_admin(chat_id):
            send_msg(
                chat_id,
                f"🐺 <b>Вітаємо, {first_name}! Ви увійшли як адміністратор.</b>\n\n"
                f"У вас є доступ до розширеного меню:\n"
                f"• 📢 Розсилки підписникам\n"
                f"• 📊 Статистика платформи\n"
                f"• 👥 Управління адмінами",
                reply_markup=admin_main_menu()
            )
        else:
            send_welcome(chat_id, first_name)
    
    elif text == "/help":
        help_text = (
            "🐺 <b>VOLKI 13:03 — Довідка</b>\n\n"
            "• Натисніть <b>Відкрити VOLKI</b> для входу в додаток\n"
            "• <b>🏆 Активні турніри</b> — перегляд списку турнірів\n"
            "• <b>📱 Наш канал</b> — перехід до нашого каналу\n\n"
        )
        if is_admin(chat_id):
            help_text += (
                "🔑 <b>Команди адміна:</b>\n"
                "• /broadcast — Розсилка всім підписникам\n"
                "• /stats — Статистика підписників\n"
                "• /addadmin &lt;chat_id&gt; — Додати адміна\n"
                "• /myid — Дізнатися свій chat_id\n"
            )
        send_msg(chat_id, help_text, reply_markup=admin_main_menu() if is_admin(chat_id) else main_menu())
    
    elif text == "/myid":
        send_msg(
            chat_id,
            f"🆔 Ваш Telegram chat_id: <code>{chat_id}</code>\n\n"
            f"Скопіюйте цей ID і збережіть в <code>admin_chat_ids.json</code> або додайте через /addadmin",
        )
    
    elif text.startswith("/addadmin"):
        if not is_admin(chat_id):
            send_msg(chat_id, "⛔ Недостатньо прав.")
            return
        parts = text.split()
        if len(parts) < 2:
            send_msg(chat_id, "❌ Використання: /addadmin &lt;chat_id&gt;\n\nНаприклад: <code>/addadmin 123456789</code>")
            return
        try:
            new_admin_id = int(parts[1])
            save_admin_id(new_admin_id)
            send_msg(chat_id, f"✅ Адміна <code>{new_admin_id}</code> додано успішно!")
            log.info(f"New admin added: {new_admin_id} (by {chat_id})")
        except ValueError:
            send_msg(chat_id, "❌ Некоректний chat_id. Введіть число.")
    
    # ─── BROADCAST COMMAND ───
    
    elif text == "/broadcast" or text == "📢 Зробити розсилку":
        if not is_admin(chat_id):
            send_msg(chat_id, "⛔ Ця функція доступна тільки для адміністраторів.\n\nЯкщо ви адмін — зверніться до розробника для отримання доступу.")
            return
        
        pending_broadcasts.pop(chat_id, None)  # Clear any existing state
        
        send_msg(
            chat_id,
            "📢 <b>Меню Розсилок VOLKI 1303</b>\n\n"
            "Оберіть шаблон або напишіть своє повідомлення.\n"
            "Розсилка буде надіслана <b>всім активним підписникам</b> бота та опублікована в каналі @volki1303.\n\n"
            "Підтримується HTML: <code>&lt;b&gt;жирний&lt;/b&gt;</code>, <code>&lt;i&gt;курсив&lt;/i&gt;</code>, <code>&lt;code&gt;код&lt;/code&gt;</code>",
            reply_markup=broadcast_templates_keyboard()
        )
    
    # ─── STATS COMMAND ───
    
    elif text == "/stats" or text == "📊 Статистика підписників":
        if not is_admin(chat_id):
            send_msg(chat_id, "⛔ Недостатньо прав.")
            return
        
        send_msg(chat_id, "⏳ Завантажую статистику...")
        bot_subs, profile_count = fetch_subscribers_count()
        all_subs = fetch_all_subscribers()
        admin_ids = load_admin_ids()
        
        send_msg(
            chat_id,
            f"📊 <b>Статистика VOLKI 1303</b>\n\n"
            f"📱 Підписників бота (активних): <b>{bot_subs}</b>\n"
            f"👤 Гравців на платформі: <b>{profile_count}</b>\n"
            f"📤 Охоплення розсилки: <b>{len(all_subs)}</b>\n"
            f"🔑 Адміністраторів: <b>{len(admin_ids)}</b>\n\n"
            f"🌐 <a href='{WEBAPP_URL}'>Відкрити платформу</a>",
            reply_markup=admin_main_menu()
        )
    
    elif text == "👥 Список адмінів":
        if not is_admin(chat_id):
            send_msg(chat_id, "⛔ Недостатньо прав.")
            return
        
        admin_ids = load_admin_ids()
        if not admin_ids:
            send_msg(chat_id, "Список адмінів порожній.\n\nВикористайте /addadmin &lt;chat_id&gt; щоб додати першого адміна.")
            return
        
        admin_list = "\n".join([f"• <code>{aid}</code>" for aid in admin_ids])
        send_msg(
            chat_id,
            f"👥 <b>Адміністратори ({len(admin_ids)}):</b>\n\n{admin_list}\n\n"
            f"➕ Додати: /addadmin &lt;chat_id&gt;",
            reply_markup=admin_main_menu()
        )
    
    # ─── ADMIN PANEL BUTTON ───
    
    elif text == "⬅️ Головне меню":
        send_welcome(chat_id, first_name)
    
    # ─── STANDARD MENU BUTTONS ───
    
    elif text == "🏆 Активні турніри" or text == "/tournaments":
        tourneys = fetch_tournaments_from_db()
        if tourneys is None:
            send_msg(chat_id, "❌ <b>Не вдалося зв'язатися з базою даних.</b> Спробуйте пізніше або зверніться до підтримки.")
            return
        
        active_tourneys = [t for t in tourneys if t.get("status") in ("upcoming", "active")]
        
        if not active_tourneys:
            send_msg(
                chat_id,
                "🐺 <b>Наразі немає активних або запланованих турнірів.</b>\n\nСлідкуйте за оновленнями або зареєструйтесь у застосунку! ⚔️",
                reply_markup={"inline_keyboard": [[{"text": "🎮 Відкрити VOLKI", "web_app": {"url": WEBAPP_URL}}]]}
            )
            return
        
        response_text = f"🐺 <b>АКТИВНІ ТУРНІРИ VOLKI 13:03:</b>\n\n"
        for t in active_tourneys[:3]:
            response_text += format_tournament(t) + "\n\n"
        
        send_msg(
            chat_id,
            response_text,
            reply_markup={"inline_keyboard": [[{"text": "🎮 Відкрити додаток", "web_app": {"url": WEBAPP_URL}}]]}
        )
    
    elif text == "📱 Наш канал":
        send_msg(
            chat_id,
            "📱 Приєднуйтесь до нашого офіційного каналу, щоб не пропустити важливі новини, розіграші та стріми матчів!",
            reply_markup={"inline_keyboard": [[{"text": "🐺 Наш канал", "url": "https://t.me/volki1303"}]]}
        )
    
    else:
        # Any other message — show appropriate welcome
        if is_admin(chat_id):
            send_msg(
                chat_id,
                f"🐺 Привіт, {first_name}! Ви в адмін-панелі.\nОберіть дію з меню нижче:",
                reply_markup=admin_main_menu()
            )
        else:
            send_welcome(chat_id, first_name)


# ─── Background Supabase Sync Thread ───

def monitor_new_tournaments():
    """Background loop that polls Supabase and broadcasts new tournaments"""
    log.info("Background Supabase Tournament Monitor thread started successfully!")
    
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
            tourneys = fetch_tournaments_from_db()
            if tourneys:
                new_tourneys = [t for t in tourneys if t["id"] not in announced_ids]
                
                for t in reversed(new_tourneys):
                    tourney_name = t.get("name", "Без назви")
                    log.info(f"🎉 New tournament detected in DB: {tourney_name} (ID: {t['id']})")
                    
                    announcement = (
                        f"🚨 <b>АНОНС НОВОГО ТУРНІРУ!</b> 🚨\n\n"
                        f"{format_tournament(t)}\n"
                        f"🔥 <b>Реєстрація відкрита!</b> Заходь у додаток та подавай заявку зі своєю командою прямо зараз! 👇"
                    )
                    
                    sent, failed = do_broadcast(announcement)
                    log.info(f"Tournament '{tourney_name}' broadcast: ✅ {sent} sent, ❌ {failed} failed")
                    
                    announced_ids.add(t["id"])
                    save_json(ANNOUNCED_FILE, list(announced_ids))
                        
        except Exception as e:
            log.error(f"Error in background monitor loop: {e}")
            
        time.sleep(15)  # Poll database every 15 seconds

def monitor_new_invites():
    """Background loop that polls Supabase for pending team invites and sends DM to invitees"""
    log.info("Background Supabase Team Invites Monitor thread started!")
    
    while True:
        try:
            # Fetch pending invites that haven't been notified yet
            url = f"{SUPABASE_URL}/rest/v1/team_invites?status=eq.pending&bot_notified=eq.false&select=*,teams(name),tournaments(name),profiles!team_invites_invitee_id_fkey(telegram_id)"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            req = urllib.request.Request(url, headers=headers)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                invites = json.loads(resp.read().decode("utf-8"))
            
            for inv in invites:
                invite_id = inv.get("id")
                tg_id = inv.get("profiles", {}).get("telegram_id")
                team_name = inv.get("teams", {}).get("name", "Команда")
                tournament_name = inv.get("tournaments", {}).get("name", "Турнір")
                
                if tg_id:
                    try:
                        chat_id = int(tg_id)
                        text = (
                            f"🎟️ <b>Нове запрошення!</b>\n\n"
                            f"Вас запросили вступити в команду <b>{team_name}</b> на турнір <b>{tournament_name}</b>.\n\n"
                            f"Що бажаєте зробити?"
                        )
                        kb = {
                            "inline_keyboard": [
                                [{"text": "✅ Прийняти", "callback_data": f"invite_accept_{invite_id}"}],
                                [{"text": "❌ Відхилити", "callback_data": f"invite_decline_{invite_id}"}]
                            ]
                        }
                        res = tg_request("sendMessage", {
                            "chat_id": chat_id,
                            "text": text,
                            "parse_mode": "HTML",
                            "reply_markup": kb
                        })
                        
                        if res and res.get("ok"):
                            log.info(f"Invite notification sent to {chat_id} for team {team_name}")
                            # Mark as notified
                            supabase_request("PATCH", "team_invites", payload={"bot_notified": True}, query=f"?id=eq.{invite_id}")
                    except Exception as ex:
                        log.error(f"Error sending invite notification to {tg_id}: {ex}")
                else:
                    # No telegram ID found for this user, mark as notified to skip next time
                    supabase_request("PATCH", "team_invites", payload={"bot_notified": True}, query=f"?id=eq.{invite_id}")
                    
        except Exception as e:
            log.error(f"Error in invite monitor loop: {e}")
            
        time.sleep(10)  # Poll invites every 10 seconds

# ─── Polling Mode ───

def run_polling():
    """Long-polling mode for the bot"""
    log.info(f"Starting VOLKI bot in POLLING mode...")
    log.info(f"WebApp URL: {WEBAPP_URL}")
    log.info(f"Supabase URL: {SUPABASE_URL}")
    
    me = tg_request("getMe")
    if not me or not me.get("ok"):
        log.error("Invalid bot token! Check BOT_TOKEN.")
        sys.exit(1)
    
    bot_name = me["result"]["username"]
    log.info(f"Bot connected: @{bot_name}")
    
    admin_ids = load_admin_ids()
    log.info(f"Admin IDs loaded: {admin_ids if admin_ids else 'None (use /myid to get your chat_id, then add to admin_chat_ids.json)'}")
    
    # Delete any existing webhook
    tg_request("deleteWebhook", {"drop_pending_updates": True})
    
    # Start the background sync monitor thread
    monitor_thread = threading.Thread(target=monitor_new_tournaments, daemon=True)
    monitor_thread.start()
    
    # Start the invites monitor thread
    invites_thread = threading.Thread(target=monitor_new_invites, daemon=True)
    invites_thread.start()
    
    log.info("🐺 VOLKI bot is fully running! Listening for messages...")
    
    offset = 0
    while True:
        try:
            updates = tg_request("getUpdates", {
                "offset": offset,
                "timeout": 30,
                "allowed_updates": ["message", "callback_query"]
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
