import urllib.request
import json
import ssl
import uuid

ctx = ssl.create_default_context()

insert_url = "https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/tournaments"
insert_headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": "Bearer sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

tourney_data = {
    "id": str(uuid.uuid4()),
    "name": "EXACT TEST TOURNEY",
    "type": "2X2",
    "date": "20.05.2026, 22:00",
    "prize_pool": "25 000 🪙",
    "prize_first": "12 500 🪙",
    "prize_second": "7 500 🪙",
    "prize_third": "5 000 🪙",
    "participants_count": 0,
    "max_participants": 16,
    "status": "upcoming",
    "map": "de_dust2",
    "system": "Single Elimination",
    "rules": ["Rule 1", "Rule 2"],
    "created_by": None
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
