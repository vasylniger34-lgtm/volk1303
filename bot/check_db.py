import urllib.request
import json
import ssl

headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": "Bearer sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv"
}

ctx = ssl.create_default_context()

def check_table(table):
    url = f"https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/{table}?select=*"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"\n--- Table: {table} ({len(data)} items) ---")
            for item in data[:5]:
                print(item)
    except Exception as e:
        print(f"Error checking {table}: {e}")

check_table("profiles")
check_table("tournaments")
