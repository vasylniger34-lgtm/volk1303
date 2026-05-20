import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

# 1. Sign in to get JWT token
login_url = "https://nbjnmzrjlvjbejgeogce.supabase.co/auth/v1/token?grant_type=password"
login_headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Content-Type": "application/json"
}
login_data = {
    "email": "11111111@telegram.volki.app",
    "password": "volki_tg_11111111_secure"
}

try:
    req = urllib.request.Request(
        login_url,
        data=json.dumps(login_data).encode("utf-8"),
        headers=login_headers,
        method="POST"
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        access_token = res["access_token"]
        print("Successfully authenticated! Token retrieved.")
except Exception as e:
    print("Authentication failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
    exit(1)

# 2. Try to insert tournament with the JWT token
insert_url = "https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/tournaments"
insert_headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

tourney_data = {
    "name": "Auth Test Tourney",
    "type": "2X2",
    "date": "20.05.2026",
    "prize_pool": "1000",
    "map": "de_dust2",
    "system": "Single Elimination",
    "rules": ["Rule 1"]
}

try:
    req = urllib.request.Request(
        insert_url,
        data=json.dumps(tourney_data).encode("utf-8"),
        headers=insert_headers,
        method="POST"
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        print("Success! Status:", resp.status)
        print(resp.read().decode("utf-8"))
except Exception as e:
    print("Error inserting tournament:", e)
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
