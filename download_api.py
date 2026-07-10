import urllib.request
import json

url = "https://datasets-server.huggingface.co/rows?dataset=KisanVaani/agriculture-qa-english-only&config=default&split=train&offset=0&limit=100"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"SUCCESS: Fetched {len(data['rows'])} rows!")
        print("First row:", data['rows'][0]['row'])
except Exception as e:
    print("ERROR:", e)
