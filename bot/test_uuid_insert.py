import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

insert_url = "https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/tournaments"
insert_headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": "Bearer sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# A random valid UUID that doesn't exist in profiles
bad_uuid = "99999999-9999-9999-9999-999999999999"

tourney_data = {
    "name": "UUID Violation Tourney",
    "type": "2X2",
    "date": "20.05.2026",
    "prize_pool": "1000",
    "map": "de_dust2",
    "system": "Single Elimination",
    "rules": ["Rule 1"],
    "created_by": bad_uuid
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
