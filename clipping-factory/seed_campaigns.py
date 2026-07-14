import urllib.request
import urllib.error
import json
import time
import base64
import os

API_URL = os.environ.get("API_URL", "http://localhost:8000/api/v1")

# We will seed two demo websites/creators to trigger campaign scans
PAGES_TO_SEED = [
    {
        "name": "MKBHD (Marques Brownlee)",
        "email": "mkbhd@example.com",
        "settings": {
            "source_url": "https://www.youtube.com/c/mkbhd",
            "campaign_type": "tech_review_clips"
        }
    },
    {
        "name": "MrBeast",
        "email": "mrbeast@example.com",
        "settings": {
            "source_url": "https://www.youtube.com/c/mrbeast",
            "campaign_type": "viral_challenge_clips"
        }
    }
]

def wait_for_api():
    print("[*] Waiting for backend API to be ready at http://localhost:8000...")
    for _ in range(60):
        try:
            req = urllib.request.Request("http://localhost:8000/ping")
            with urllib.request.urlopen(req) as res:
                if res.status == 200:
                    print("[+] API is online.")
                    return True
        except Exception:
            pass
        time.sleep(5)
    
    print("[-] API did not come online within 5 minutes.")
    return False

def post_json(endpoint, data):
    req = urllib.request.Request(f"{API_URL}{endpoint}", method="POST")
    req.add_header('Content-Type', 'application/json')
    auth_str = base64.b64encode(b"admin:change-me-admin-password").decode()
    req.add_header('Authorization', f'Basic {auth_str}')
    
    jsondata = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=jsondata) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"[-] HTTP Error {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"[-] Error: {e}")
        return None

def get_json(endpoint):
    req = urllib.request.Request(f"{API_URL}{endpoint}", method="GET")
    auth_str = base64.b64encode(b"admin:change-me-admin-password").decode()
    req.add_header('Authorization', f'Basic {auth_str}')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"[-] HTTP Error {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"[-] Error: {e}")
        return None

def main():
    print("Starting Clipping Factory Campaign Seeder...")
    if not wait_for_api():
        return
    
    for page_data in PAGES_TO_SEED:
        print(f"\n[*] Creating Page for: {page_data['name']}")
        result = post_json("/pages", page_data)
        
        if result and "id" in result:
            page_id = result["id"]
            print(f"[+] Page Created! ID: {page_id}")
            
            print(f"[*] Triggering Campaign Scan for Page {page_id}...")
            scan_result = post_json(f"/pages/{page_id}/scan", {})
            if scan_result:
                print(f"[+] Scan triggered! Task ID: {scan_result.get('task_id')}")
        else:
            print(f"[-] Failed to create page {page_data['name']}")
            
    print("\n[*] Waiting 5 seconds for Celery workers to initialize campaigns...")
    time.sleep(5)
    
    print("[*] Fetching active campaigns...")
    campaigns = get_json("/campaigns")
    if campaigns and "items" in campaigns:
        items = campaigns["items"]
        print(f"\n{'='*40}")
        print(f"LIVE CAMPAIGNS FOUND: {len(items)}")
        print(f"{'='*40}")
        for c in items:
            print(f"ID: {c.get('id')}")
            print(f"Title: {c.get('title')}")
            print(f"Status: {c.get('status')}")
            print(f"Generated Clips: {c.get('clips_generated')}")
            print("-" * 20)
    else:
        print("[-] Could not retrieve campaigns.")

if __name__ == "__main__":
    main()
