#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1. Upload all processed nation images to WordPress media
2. Save a JSON with media URLs
3. Build + inject the nations slider into WoodMart custom_js
"""

import os, sys, json, requests, io
from pathlib import Path
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# ── Config ───────────────────────────────────────────────────────────────────
SITE          = "https://onezonejersey.com"
WP_USER       = "AMIT"
WP_APP_PASS   = "VsBI FDeI GA9S ke4v Vpoy zvNt"
PROCESSED_DIR = Path(__file__).parent / "processed"
URLS_FILE     = Path(__file__).parent / "uploaded_urls.json"

TEAMS = ["ארגנטינה", "ברזיל", "גרמניה", "הולנד", "ספרד", "פורטוגל", "צרפת", "אנגליה"]

# Search slugs for each team (links to product search)
TEAM_SLUGS = {
    "ארגנטינה": "ארגנטינה",
    "ברזיל":    "ברזיל",
    "גרמניה":   "גרמניה",
    "הולנד":    "הולנד",
    "ספרד":     "ספרד",
    "פורטוגל":  "פורטוגל",
    "צרפת":     "צרפת",
    "אנגליה":   "אנגליה",
}

session = requests.Session()
session.auth = (WP_USER, WP_APP_PASS)

# ── Upload image ─────────────────────────────────────────────────────────────
def upload_image(name):
    path = PROCESSED_DIR / f"{name}.png"
    if not path.exists():
        print(f"  SKIP (file not found): {name}")
        return None

    # ASCII-only slugs for HTTP header
    slugs = {"ארגנטינה":"argentina","ברזיל":"brazil","גרמניה":"germany",
             "הולנד":"netherlands","ספרד":"spain","פורטוגל":"portugal",
             "צרפת":"france","אנגליה":"england"}

    # Compress: resize to 600×600 JPEG 85%
    img = Image.open(path).convert("RGB")
    img = img.resize((600, 600), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    data = buf.getvalue()
    print(f"  compressed {path.stat().st_size//1024}KB → {len(data)//1024}KB")

    filename = f"nations-{slugs.get(name, name)}.jpg"
    headers  = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type":        "image/jpeg",
    }
    resp = session.post(f"{SITE}/wp-json/wp/v2/media", headers=headers, data=data)
    if resp.status_code in (200, 201):
        media = resp.json()
        url   = media.get("source_url", "")
        mid   = media.get("id")
        print(f"  ✓ {name} → {url}")
        return {"id": mid, "url": url}
    else:
        print(f"  ✗ {name} failed: {resp.status_code} {resp.text[:120]}")
        return None

# ── Build slider JS ──────────────────────────────────────────────────────────
def build_slider_js(teams_data):
    """Returns JS that injects the nations slider between Elementor sections."""

    cards_js = ",\n    ".join([
        f'{{ name: "{t}", url: "{d["url"]}", href: "/?s={t}" }}'
        for t, d in teams_data.items()
    ])

    return f"""
/* ===== Nations Slider (auto-generated) ===== */
(function() {{
  var TEAMS = [
    {cards_js}
  ];

  function buildSlider() {{
    var anchor = document.querySelector('.elementor-element-f4ce794');
    if (!anchor) return;
    if (document.getElementById('oz-nations')) return; // already exists

    /* ---- Styles ---- */
    var css = [
      '#oz-nations {{ background:#fff; padding:48px 0 56px; direction:rtl; text-align:center; }}',
      '#oz-nations h2 {{ font-size:26px; font-weight:700; color:#111; margin:0 0 28px; font-family:inherit; }}',
      '#oz-nations h2 span {{ color:#e63946; }}',
      '#oz-nations .oz-viewport {{ overflow:hidden; max-width:1180px; margin:0 auto; padding:0 20px; }}',
      '#oz-nations .oz-track {{ display:flex; gap:18px; transition:transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94); will-change:transform; }}',
      '#oz-nations .oz-card {{ flex:0 0 calc(25% - 14px); background:#fff; border-radius:16px; box-shadow:0 2px 16px rgba(0,0,0,0.10); overflow:hidden; border:1px solid #f0f0f0; text-decoration:none; display:block; transition:transform 0.18s, box-shadow 0.18s; }}',
      '#oz-nations .oz-card:hover {{ transform:translateY(-5px); box-shadow:0 8px 28px rgba(0,0,0,0.15); }}',
      '#oz-nations .oz-card img {{ width:100%; height:auto; display:block; }}',
      '#oz-nations .oz-nav {{ display:flex; justify-content:center; align-items:center; gap:16px; margin-top:24px; }}',
      '#oz-nations .oz-btn {{ background:#e63946; color:#fff; border:none; border-radius:50%; width:42px; height:42px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }}',
      '#oz-nations .oz-btn:hover {{ background:#c62835; }}',
      '#oz-nations .oz-btn:disabled {{ background:#ccc; cursor:default; }}',
      '#oz-nations .oz-all {{ display:inline-block; padding:10px 28px; background:#e63946; color:#fff; border-radius:8px; font-size:15px; font-weight:600; text-decoration:none; transition:background 0.15s; margin-top:20px; }}',
      '#oz-nations .oz-all:hover {{ background:#c62835; }}',
      '@media(max-width:768px){{ #oz-nations .oz-card {{ flex:0 0 calc(50% - 9px); }} }}'
    ].join('\\n');

    var style = document.createElement('style');
    style.id  = 'oz-nations-style';
    style.textContent = css;
    document.head.appendChild(style);

    /* ---- Cards HTML ---- */
    var cardsHtml = TEAMS.map(function(t) {{
      return '<a class="oz-card" href="' + t.href + '"><img src="' + t.url + '" alt="' + t.name + '" loading="lazy"></a>';
    }}).join('');

    /* ---- Section HTML ---- */
    var sec = document.createElement('div');
    sec.id  = 'oz-nations';
    sec.innerHTML =
      '<h2>בחר את <span>הנבחרת שלך</span></h2>' +
      '<div class="oz-viewport"><div class="oz-track">' + cardsHtml + '</div></div>' +
      '<div class="oz-nav">' +
        '<button class="oz-btn" id="oz-prev" aria-label="הקודם">&#8250;</button>' +
        '<button class="oz-btn" id="oz-next" aria-label="הבא">&#8249;</button>' +
      '</div>' +
      '<a class="oz-all" href="/מוצר-קטגוריה/נבחרות/">&#x26BD; כל נבחרות מונדיאל 2026</a>';

    anchor.insertAdjacentElement('afterend', sec);

    /* ---- Slider logic ---- */
    var track    = sec.querySelector('.oz-track');
    var prevBtn  = sec.querySelector('#oz-prev');
    var nextBtn  = sec.querySelector('#oz-next');
    var cards    = sec.querySelectorAll('.oz-card');
    var visible  = window.innerWidth <= 768 ? 2 : 4;
    var total    = cards.length;
    var idx      = 0;

    function getCardWidth() {{
      return cards[0].getBoundingClientRect().width + 18; // card + gap
    }}

    function update() {{
      track.style.transform = 'translateX(' + (idx * getCardWidth()) + 'px)';
      prevBtn.disabled = (idx === 0);
      nextBtn.disabled = (idx >= total - visible);
    }}

    prevBtn.addEventListener('click', function() {{ if (idx > 0) {{ idx--; update(); }} }});
    nextBtn.addEventListener('click', function() {{ if (idx < total - visible) {{ idx++; update(); }} }});

    window.addEventListener('resize', function() {{
      visible = window.innerWidth <= 768 ? 2 : 4;
      if (idx > total - visible) idx = total - visible;
      update();
    }});

    update();
  }}

  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', buildSlider);
  }} else {{
    buildSlider();
  }}
}})();
/* ===== End Nations Slider ===== */
""".strip()

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    # Load previously uploaded URLs if available
    if URLS_FILE.exists():
        saved = json.loads(URLS_FILE.read_text(encoding='utf-8'))
    else:
        saved = {}

    print(f"Uploading images to {SITE} ...\n")
    for team in TEAMS:
        if team in saved:
            print(f"  ↩  {team} (already uploaded: {saved[team]['url']})")
            continue
        result = upload_image(team)
        if result:
            saved[team] = result

    URLS_FILE.write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nURLs saved → {URLS_FILE}")

    # Inject TEAMS into existing slider_code.js (replace only the array)
    js_file = Path(__file__).parent / "slider_code.js"
    if not js_file.exists():
        print(f"  ✗ slider_code.js not found at {js_file}")
        return

    cards_js = ",\n    ".join([
        f'{{ name: "{t}", url: "{d["url"]}", href: "/?s={t}" }}'
        for t, d in saved.items()
    ])
    teams_block = f"  var TEAMS = [\n    {cards_js}\n  ];"

    import re
    content = js_file.read_text(encoding='utf-8')
    content = re.sub(
        r'var TEAMS\s*=\s*\[[\s\S]*?\];',
        teams_block,
        content,
        count=1
    )
    js_file.write_text(content, encoding='utf-8')
    print(f"Slider JS updated → {js_file} ({len(content)} chars)")
    print("\nNext: copy slider_code.js content into the Elementor HTML widget")

if __name__ == "__main__":
    main()
