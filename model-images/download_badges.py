import sys, time, requests
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUTPUT = Path(__file__).resolve().parent.parent / "onezone-next" / "public" / "images" / "nations" / "badges"
OUTPUT.mkdir(parents=True, exist_ok=True)

# Wikimedia valid thumbnail steps: 120, 150, 240, 320, 480, 640, 800, 1024, 1280
# 400px is NOT a valid step — that's why we got 429. Use 320px.
HEADERS = {
    "User-Agent": "OneZoneJersey/1.0 (https://onezonejersey.com; amitshechter5@gmail.com) python-requests/2.31",
    "Referer": "https://onezonejersey.com",
    "Accept": "image/png,image/webp,image/*,*/*;q=0.8",
}

BADGES = {
    "spain":       "https://upload.wikimedia.org/wikipedia/en/thumb/3/39/Spain_national_football_team_crest.svg/320px-Spain_national_football_team_crest.svg.png",
    "france":      "https://upload.wikimedia.org/wikipedia/en/thumb/1/12/France_national_football_team_seal.svg/320px-France_national_football_team_seal.svg.png",
    "portugal":    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Portugal_National_Team_logo.png/320px-Portugal_National_Team_logo.png",
    "argentina":   "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Argentina_national_football_team_logo.svg/320px-Argentina_national_football_team_logo.svg.png",
    "brazil":      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Brazilian_Football_Confederation_logo.svg/320px-Brazilian_Football_Confederation_logo.svg.png",
    "england":     "https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/England_national_football_team_crest.svg/320px-England_national_football_team_crest.svg.png",
    "germany":     "https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/DFBEagle.svg/320px-DFBEagle.svg.png",
    "italy":       "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Logo_Italy_National_Football_Team_-_2023.svg/320px-Logo_Italy_National_Football_Team_-_2023.svg.png",
    "netherlands": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/Netherlands_national_football_team_logo.svg/320px-Netherlands_national_football_team_logo.svg.png",
    "belgium":     "https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Royal_Belgian_FA_logo_2019.svg/320px-Royal_Belgian_FA_logo_2019.svg.png",
    "morocco":     "https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Royal_Moroccan_Football_Federation_logo.svg/320px-Royal_Moroccan_Football_Federation_logo.svg.png",
}

print(f"\nDownloading {len(BADGES)} national team badges (320px)...\n")
ok = 0
for team, url in BADGES.items():
    out = OUTPUT / f"{team}.png"
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        # Sanity check — must be a real image
        if len(r.content) < 1000:
            raise ValueError(f"Response too small ({len(r.content)} bytes) — probably an error page")
        out.write_bytes(r.content)
        print(f"  OK  {team}.png  ({len(r.content)//1024}KB)")
        ok += 1
    except Exception as e:
        print(f"  ERR {team}: {e}")

    # Be polite to Wikimedia — wait 2s between requests
    time.sleep(2)

print(f"\nDone: {ok}/{len(BADGES)} badges saved to:\n  {OUTPUT}\n")
