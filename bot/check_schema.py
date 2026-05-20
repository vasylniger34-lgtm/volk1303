import urllib.request
import json
import ssl

headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": "Bearer sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Accept": "application/openapi+json"
}

ctx = ssl.create_default_context()

url = "https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        # Print info about 'tournaments' table from definitions/components
        tournaments_def = data.get("definitions", {}).get("tournaments", {})
        if not tournaments_def:
            tournaments_def = data.get("components", {}).get("schemas", {}).get("tournaments", {})
        
        print(json.dumps(tournaments_def, indent=2))
except Exception as e:
    print(f"Error checking schema: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
