"""
Download league logos with transparent backgrounds.
- First tries Wikimedia (SVG renders = transparent bg)
- Falls back to api-sports.io + BFS white-bg removal (edge-connected only, preserves quality)
"""
import sys, time, requests, io
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUTPUT = Path(__file__).resolve().parent.parent / "onezone-next" / "public" / "images" / "leagues"
OUTPUT.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "OneZoneJersey/1.0 (https://onezonejersey.com; amitshechter5@gmail.com) python-requests/2.31",
    "Referer": "https://onezonejersey.com",
    "Accept": "image/png,image/webp,image/*,*/*;q=0.8",
}

def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    if len(r.content) < 500:
        raise ValueError(f"Too small ({len(r.content)} bytes)")
    return r.content

def remove_white_bg_bfs(img_bytes, threshold=232):
    """BFS flood-fill from all image edges — removes only background white,
       never touches interior white pixels. Preserves full quality."""
    img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
    data = np.array(img, dtype=np.uint8)
    h, w = data.shape[:2]

    def is_white(y, x):
        r, g, b = int(data[y, x, 0]), int(data[y, x, 1]), int(data[y, x, 2])
        return r >= threshold and g >= threshold and b >= threshold

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed BFS from all 4 edges
    for x in range(w):
        for y_edge in (0, h - 1):
            if is_white(y_edge, x) and not visited[y_edge, x]:
                visited[y_edge, x] = True
                queue.append((y_edge, x))
    for y in range(1, h - 1):
        for x_edge in (0, w - 1):
            if is_white(y, x_edge) and not visited[y, x_edge]:
                visited[y, x_edge] = True
                queue.append((y, x_edge))

    bg_mask = np.zeros((h, w), dtype=bool)
    while queue:
        y, x = queue.popleft()
        bg_mask[y, x] = True
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_white(ny, nx):
                visited[ny, nx] = True
                queue.append((ny, nx))

    # Also soften the alpha on near-bg pixels (anti-alias edge)
    result = data.copy()
    result[bg_mask, 3] = 0

    # Soft fringe: pixels adjacent to bg that are slightly off-white
    from scipy.ndimage import binary_dilation
    fringe = binary_dilation(bg_mask) & ~bg_mask
    for y, x in zip(*np.where(fringe)):
        r, g, b = int(data[y, x, 0]), int(data[y, x, 1]), int(data[y, x, 2])
        brightness = (r + g + b) / 3
        if brightness > 200:
            alpha = int(255 * (1 - (brightness - 200) / 55))
            result[y, x, 3] = min(result[y, x, 3], alpha)

    return Image.fromarray(result, 'RGBA')

# (name, wikimedia_urls_to_try, api_sports_fallback_url)
LOGOS = [
    ("serie-a", [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Serie_A_logo_%282019%29.svg/320px-Serie_A_logo_%282019%29.svg.png",
        "https://upload.wikimedia.org/wikipedia/en/thumb/2/24/Serie_A_logo_%282019%29.svg/320px-Serie_A_logo_%282019%29.svg.png",
    ], "https://media.api-sports.io/football/leagues/135.png"),

    ("laliga", [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/LaLiga_logo_2023.svg/320px-LaLiga_logo_2023.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/LaLiga_logo_2024.svg/320px-LaLiga_logo_2024.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_logo_%282023%29.svg/320px-LaLiga_logo_%282023%29.svg.png",
    ], "https://media.api-sports.io/football/leagues/140.png"),

    ("ligue1", [
        "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Ligue1_logo_2024.svg/320px-Ligue1_logo_2024.svg.png",
        "https://upload.wikimedia.org/wikipedia/fr/thumb/a/a6/Ligue1_logo_2024.svg/320px-Ligue1_logo_2024.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ligue1_logo_2024.svg/320px-Ligue1_logo_2024.svg.png",
    ], "https://media.api-sports.io/football/leagues/61.png"),

    ("champions-league", [
        "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/UEFA_Champions_League_logo_2.svg/320px-UEFA_Champions_League_logo_2.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/UEFA_Champions_League_logo_2.svg/320px-UEFA_Champions_League_logo_2.svg.png",
    ], "https://media.api-sports.io/football/leagues/2.png"),
]

print(f"\nDownloading {len(LOGOS)} remaining league logos...\n")
ok = 0
for name, wiki_urls, fallback_url in LOGOS:
    out = OUTPUT / f"{name}.png"
    downloaded = False

    # Try Wikimedia first (transparent bg)
    for url in wiki_urls:
        try:
            data = fetch(url)
            out.write_bytes(data)
            print(f"  OK  (wikimedia) {name}.png  ({len(data)//1024}KB)")
            downloaded = True
            ok += 1
            break
        except Exception as e:
            print(f"  ..  wikimedia miss: {url.split('/')[-1][:40]} — {e}")
        time.sleep(1)

    if not downloaded:
        # Fallback: api-sports.io + BFS white removal
        try:
            raw = fetch(fallback_url)
            try:
                img = remove_white_bg_bfs(raw)
                img.save(str(out), 'PNG')
                print(f"  OK  (api-sports+bfs) {name}.png")
                ok += 1
            except ImportError:
                # scipy not available — use basic BFS without fringe softening
                img = Image.open(io.BytesIO(raw)).convert('RGBA')
                data_arr = np.array(img, dtype=np.uint8)
                h, w = data_arr.shape[:2]
                threshold = 232

                def is_white(y, x):
                    return all(int(data_arr[y,x,c]) >= threshold for c in range(3))

                visited = np.zeros((h, w), dtype=bool)
                queue = deque()
                for x in range(w):
                    for ye in (0, h-1):
                        if is_white(ye, x) and not visited[ye, x]:
                            visited[ye, x] = True; queue.append((ye, x))
                for y in range(1, h-1):
                    for xe in (0, w-1):
                        if is_white(y, xe) and not visited[y, xe]:
                            visited[y, xe] = True; queue.append((y, xe))
                result = data_arr.copy()
                while queue:
                    y, x = queue.popleft()
                    result[y, x, 3] = 0
                    for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
                        ny, nx = y+dy, x+dx
                        if 0 <= ny < h and 0 <= nx < w and not visited[ny,nx] and is_white(ny,nx):
                            visited[ny,nx] = True; queue.append((ny,nx))
                Image.fromarray(result, 'RGBA').save(str(out), 'PNG')
                print(f"  OK  (api-sports+bfs-basic) {name}.png")
                ok += 1
        except Exception as e:
            print(f"  ERR {name}: {e}")
    time.sleep(2)

print(f"\nDone: {ok}/{len(LOGOS)} logos saved to:\n  {OUTPUT}\n")
