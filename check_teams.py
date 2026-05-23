import urllib.request
import json
import ssl

url = "https://nbjnmzrjlvjbejgeogce.supabase.co/rest/v1/teams?select=players"
headers = {
    "apikey": "sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv",
    "Authorization": "Bearer sb_publishable_wqRcNT9yKJNi16EIeqpwnQ_bfiaA_vv"
}

req = urllib.request.Request(url, headers=headers)
ctx = ssl.create_default_context()
with urllib.request.urlopen(req, context=ctx) as resp:
    print(resp.read().decode())
