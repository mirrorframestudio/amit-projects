"""
Meta Ads Generator — Web UI
Run: python ads_web.py
Open: http://localhost:5050
"""
import os, sys, json, time, uuid, subprocess, requests
from pathlib import Path
from datetime import datetime
from flask import Flask, request, Response, send_from_directory, render_template_string, jsonify

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
OUTPUT_DIR = ROOT / "output" / "meta_ads"
LIBRARY_DIR = ROOT / "library"
LIBRARY_MANIFEST = LIBRARY_DIR / "library.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LIBRARY_DIR.mkdir(parents=True, exist_ok=True)


def _load_library() -> list:
    if not LIBRARY_MANIFEST.exists():
        return []
    try:
        return json.loads(LIBRARY_MANIFEST.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_library(items: list):
    LIBRARY_MANIFEST.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Load .env (same pattern as generate_meta_ads.py) ───────────────────────────
def _load_env(path):
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
    except FileNotFoundError:
        pass

for _p in [PROJECT_ROOT / "fb-ads-analyzer" / ".env",
           PROJECT_ROOT / "adcampaigner" / ".env",
           ROOT / ".env"]:
    _load_env(_p)

WOO_URL    = os.getenv("WOO_URL", "").rstrip("/")
WOO_KEY    = os.getenv("WOO_CONSUMER_KEY", "")
WOO_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB total upload

# Import generation pipeline directly (no subprocess for upload mode)
sys.path.insert(0, str(ROOT))
from generate_meta_ads import (  # noqa: E402
    generate_ad_image, make_square, make_story, fit_to_aspect, add_logo,
    generate_marketing_copy, upscale_image, swap_background, STYLE_BACKGROUNDS,
    ASPECT_DESC, LOGO_PATH, log_generation, get_stats_summary,
)
from ad_templates import apply_template, TEMPLATES  # noqa: E402

# In-memory upload job store: job_id -> {files: [...]}
UPLOAD_JOBS = {}

# ── HTML ───────────────────────────────────────────────────────────────────────
HTML = r"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meta Ads Generator ⚽</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f14; color: #e5e5e5; font-family: 'Segoe UI', Arial, sans-serif;
         direction: rtl; min-height: 100vh; padding: 24px 16px; }
  h1 { font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 28px; }
  .card { background: #1a1a24; border: 1px solid #2a2a38; border-radius: 12px;
          padding: 24px; max-width: 880px; margin: 0 auto; }
  label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px; margin-top: 16px; }
  label:first-of-type { margin-top: 0; }
  input[type=text], select {
    width: 100%; padding: 10px 14px; background: #0f0f14; border: 1px solid #333;
    border-radius: 8px; color: #fff; font-size: 1rem; direction: rtl;
    outline: none; transition: border-color .2s;
  }
  input[type=text]:focus, select:focus { border-color: #ffd200; }
  .row { display: flex; gap: 12px; }
  .row > div { flex: 1; }
  button#runBtn {
    padding: 13px; background: #ffd200;
    color: #0f0f14; font-size: 1.05rem; font-weight: 700; border: none;
    border-radius: 8px; cursor: pointer; transition: opacity .2s;
  }
  button#runBtn:hover { opacity: .88; }
  button#runBtn:disabled { opacity: .4; cursor: not-allowed; }
  button#regenBtn:hover { background: #555 !important; }
  button#regenBtn:disabled { opacity: .4; cursor: not-allowed; }

  #logBox {
    display: none; margin-top: 20px; background: #0a0a0e; border: 1px solid #222;
    border-radius: 8px; padding: 14px; height: 180px; overflow-y: auto;
    font-family: Consolas, monospace; font-size: 0.8rem; color: #8bc34a;
    direction: ltr; text-align: left;
  }
  #logBox .err { color: #f44336; }

  #results { display: none; margin-top: 28px; }
  #results h2 { font-size: 1.1rem; color: #fff; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .img-card { background: #1a1a24; border: 1px solid #2a2a38; border-radius: 10px; overflow: hidden; }
  .img-card img { width: 100%; display: block; cursor: pointer; }
  .img-card .img-label {
    padding: 8px 10px; font-size: 0.78rem; color: #888;
    display: flex; justify-content: space-between; align-items: center;
  }
  .img-card a { color: #ffd200; text-decoration: none; font-weight: 600; }
  .badge { font-size: 0.7rem; background: #2a2a38; border-radius: 4px; padding: 2px 6px; }
  .badge.square { color: #64b5f6; }
  .badge.story  { color: #ce93d8; }
  #status { margin-top: 10px; font-size: 0.85rem; color: #ffd200; text-align: center; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid #2a2a38; }
  .tab { padding: 10px 18px; cursor: pointer; color: #888; font-size: 0.9rem;
         border-bottom: 2px solid transparent; transition: all .2s; }
  .tab:hover { color: #ccc; }
  .tab.active { color: #ffd200; border-bottom-color: #ffd200; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Product picker */
  .picker-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .picker-toolbar input { flex: 1; }
  .picker-toolbar button {
    background: #2a2a38; border: 1px solid #3a3a48; color: #ccc;
    padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; white-space: nowrap;
  }
  .picker-toolbar button:hover { background: #3a3a48; }
  #pickerCount { color: #ffd200; font-weight: 600; font-size: 0.85rem; }

  .picker-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px; max-height: 480px; overflow-y: auto; padding: 4px;
    border: 1px solid #2a2a38; border-radius: 8px; background: #0a0a0e;
  }
  .picker-grid::-webkit-scrollbar { width: 8px; }
  .picker-grid::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

  .product {
    position: relative; background: #1a1a24; border: 2px solid transparent;
    border-radius: 8px; cursor: pointer; overflow: hidden; transition: border-color .15s;
  }
  .product:hover { border-color: #444; }
  .product.selected { border-color: #ffd200; }
  .product img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; background: #fff; }
  .product .info { padding: 6px 8px; font-size: 0.72rem; color: #ccc; line-height: 1.3;
                   height: 44px; overflow: hidden; }
  .product .price { color: #ffd200; font-weight: 600; font-size: 0.7rem; padding: 0 8px 6px; }
  .product .check {
    position: absolute; top: 6px; right: 6px; width: 22px; height: 22px;
    background: rgba(0,0,0,0.6); border: 1px solid #555; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #ffd200; font-weight: 700; font-size: 14px;
  }
  .product.selected .check { background: #ffd200; color: #0f0f14; border-color: #ffd200; }

  .picker-empty { text-align: center; padding: 40px; color: #666; }
  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid #444; border-top-color: #ffd200; border-radius: 50%;
    animation: spin 0.7s linear infinite; vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Image card overlay actions */
  .img-card { position: relative; }
  .img-actions {
    position: absolute; top: 6px; right: 6px;
    display: flex; gap: 4px; z-index: 5;
  }
  .ico-btn {
    background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff; width: 30px; height: 30px; border-radius: 50%;
    font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    padding: 0; transition: all .15s;
  }
  .ico-btn:hover { background: rgba(0, 0, 0, 0.85); transform: scale(1.1); }
  .fav-btn.on { background: #ffd200; color: #0f0f14; border-color: #ffd200; }
  .del-btn:hover { background: #c62828; border-color: #c62828; }
  .bg-btn:hover { background: #1976d2; border-color: #1976d2; }

  /* Copy variants */
  .copy-card {
    background: #1a1a24; border: 1px solid #2a2a38; border-radius: 8px;
    padding: 12px 14px; margin-bottom: 10px;
  }
  .copy-vibe {
    display: inline-block; background: #9c27b0; color: #fff; font-size: 0.7rem;
    padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; font-weight: 600;
  }
  .copy-headline { color: #fff; font-size: 1.1rem; font-weight: 700; line-height: 1.3; }
  .copy-subline  { color: #ccc; font-size: 0.92rem; margin-top: 4px; line-height: 1.4; }
  .copy-cta      { color: #ffd200; font-weight: 600; margin-top: 6px; font-size: 0.9rem; }
  .copy-hashtags { color: #4fc3f7; font-size: 0.8rem; margin-top: 6px; word-break: break-all; }
  .copy-actions  { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .copy-btn {
    background: #2a2a38; border: 1px solid #3a3a48; color: #ccc;
    padding: 5px 11px; border-radius: 5px; cursor: pointer; font-size: 0.78rem;
  }
  .copy-btn:hover { background: #3a3a48; color: #ffd200; }
  .copy-btn.copied { background: #4caf50 !important; color: #fff !important; }

  /* Template picker cards */
  .tpl-card {
    cursor: pointer; user-select: none; border: 2px solid transparent;
    border-radius: 8px; overflow: hidden; transition: border-color .15s;
    background: #1a1a24;
  }
  .tpl-card:hover { border-color: #444; }
  .tpl-card.active { border-color: #ffd200; }
  .tpl-thumb {
    aspect-ratio: 1; background: linear-gradient(135deg, #4a3a2a 0%, #6a5a4a 100%);
    position: relative; overflow: hidden;
  }
  .tpl-name {
    text-align: center; color: #ccc; font-size: 0.78rem; padding: 6px 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .tpl-card.active .tpl-name { color: #ffd200; }

  /* Stats bar */
  #statsBar {
    display: flex; gap: 8px; margin-bottom: 22px; flex-wrap: wrap;
  }
  .stat-cell {
    flex: 1; min-width: 110px; background: #0f0f14; border: 1px solid #2a2a38;
    border-radius: 8px; padding: 9px 12px; text-align: center;
    display: flex; flex-direction: column; gap: 2px;
  }
  .stat-cell.stat-cost { border-color: #ffd200; background: #1a1605; }
  .stat-label { font-size: 0.7rem; color: #888; }
  .stat-cell span:last-child { font-size: 1.05rem; font-weight: 700; color: #fff; }
  .stat-cell.stat-cost span:last-child { color: #ffd200; }

  /* Example chips */
  .ex-chip {
    background: #2a2a38; color: #ccc; padding: 5px 11px; border-radius: 14px;
    font-size: 0.78rem; cursor: pointer; transition: all .15s; border: 1px solid #3a3a48;
    user-select: none;
  }
  .ex-chip:hover { background: #3a3a48; color: #ffd200; border-color: #ffd200; }
  .ex-chip.active { background: #ffd200; color: #0f0f14; border-color: #ffd200; }

  /* Upload zone */
  #dropzone {
    border: 2px dashed #444; border-radius: 10px; padding: 32px 16px;
    text-align: center; color: #888; cursor: pointer; transition: all .2s;
    background: #0a0a0e;
  }
  #dropzone:hover, #dropzone.drag { border-color: #ffd200; color: #ffd200; background: #1a1a14; }
  #uploadList { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .upload-row {
    display: flex; gap: 10px; align-items: center; background: #0f0f14;
    border: 1px solid #2a2a38; border-radius: 8px; padding: 8px;
  }
  .upload-row img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; background: #fff; }
  .upload-row .fields { flex: 1; display: flex; gap: 6px; }
  .upload-row input { padding: 6px 10px; font-size: 0.85rem; }
  .upload-row .name-fld { flex: 2; }
  .upload-row .price-fld { flex: 1; max-width: 90px; }
  .upload-row .remove {
    background: none; border: none; color: #f44336; font-size: 1.3rem;
    cursor: pointer; padding: 4px 8px;
  }
</style>
</head>
<body>
<div class="card">
  <h1>⚽ Meta Ads Generator</h1>
  <p class="subtitle">
    מייצר קריאייטיב שיווקי לפרסום — פיד + סטורי
    {% if logo_present %}
      <span style="color: #4caf50; margin-right: 8px;">· 🏷 לוגו פעיל</span>
    {% else %}
      <span style="color: #ff9800; margin-right: 8px;">· ⚠ אין logo.png</span>
    {% endif %}
  </p>

  <div id="statsBar">
    <div class="stat-cell"><span class="stat-label">היום</span> <span id="stToday">—</span></div>
    <div class="stat-cell"><span class="stat-label">החודש</span> <span id="stMonth">—</span></div>
    <div class="stat-cell"><span class="stat-label">סה"כ</span> <span id="stTotal">—</span></div>
    <div class="stat-cell stat-cost"><span class="stat-label">עלות החודש</span> <span id="stCost">—</span></div>
  </div>

  <form id="form" onsubmit="return false;">
    <label>תיאור נוסף לתמונה (אופציונלי)</label>
    <input type="text" id="adText" placeholder='לחץ על דוגמה למטה או רשום משלך...' autocomplete="off">
    <div id="promptExamples" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
      <span class="ex-chip" onclick="setPrompt(this)">חברים מחבקים, אווירת ניצחון</span>
      <span class="ex-chip" onclick="setPrompt(this)">צעירים מצחקקים יחד, אווירת קיץ</span>
      <span class="ex-chip" onclick="setPrompt(this)">פוזה רצינית, אווירת אצטדיון לפני משחק</span>
      <span class="ex-chip" onclick="setPrompt(this)">אבא וילדים, מראה משפחתי</span>
      <span class="ex-chip" onclick="setPrompt(this)">חברות יוצאות לבילוי, צוחקות</span>
      <span class="ex-chip" onclick="setPrompt(this)">קופצים באוויר עם זרועות פתוחות</span>
      <span class="ex-chip" onclick="setPrompt(this)">פוזה אגרסיבית, אווירה כבדה</span>
      <span class="ex-chip" onclick="setPrompt(this)">מראה אופנתי-עירוני, סגנון רחוב</span>
    </div>
    <div style="font-size: 0.75rem; color: #666; margin-top: 8px;">
      ⚠ לא יוצג על התמונה — זו הנחיה ל-AI מה לכלול בתמונה. תמיד דוגמנים ישראלים 🇮🇱
    </div>

    <label style="margin-top: 20px;">מקור התמונות</label>
    <div class="tabs">
      <div class="tab active" onclick="switchTab(event, 'upload')">📤 העלה תמונות</div>
      <div class="tab" onclick="switchTab(event, 'top')">🔥 הכי נמכרים</div>
      <div class="tab" onclick="switchTab(event, 'pick')">✓ בחר ידנית</div>
    </div>

    <div id="tab-upload" class="tab-content active">
      <div id="dropzone" onclick="document.getElementById('fileInput').click()">
        <div style="font-size: 2.5rem;">📤</div>
        <div style="margin-top: 6px;">גרור תמונות לכאן, או לחץ לבחירה</div>
        <div style="font-size: 0.75rem; color: #666; margin-top: 6px;">
          JPG / PNG · כל החולצות יופיעו ביחד באותה תמונה
        </div>
      </div>
      <input type="file" id="fileInput" multiple accept="image/*" style="display:none" onchange="addFiles(this.files)">
      <div id="uploadList"></div>

      <details style="margin-top: 16px; background: #0f0f14; border: 1px solid #2a2a38; border-radius: 8px; padding: 10px 14px;" open>
        <summary style="cursor: pointer; color: #ccc; font-size: 0.9rem; user-select: none;">
          📚 ספריית חולצות שמורות <span id="libCount" style="color:#888;">(0)</span>
        </summary>
        <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">
          לחץ על חולצה כדי להוסיף לבחירה הנוכחית. שמור חולצות שאתה משתמש בהן הרבה.
        </div>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <button type="button" onclick="document.getElementById('libFileInput').click()" style="background:#2a2a38; border:1px solid #3a3a48; color:#ccc; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">➕ הוסף לספרייה</button>
          <input type="file" id="libFileInput" multiple accept="image/*" style="display:none" onchange="addToLibrary(this.files)">
          <button type="button" onclick="loadLibrary()" style="background:#2a2a38; border:1px solid #3a3a48; color:#ccc; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔄 רענן</button>
        </div>
        <div id="libGrid" class="picker-grid" style="margin-top: 10px; max-height: 280px;"></div>
      </details>
    </div>

    <div id="tab-top" class="tab-content">
      <select id="limit">
        <option value="1">1 מוצר (בדיקה)</option>
        <option value="3">3 מוצרים</option>
        <option value="5" selected>5 מוצרים</option>
        <option value="10">10 מוצרים</option>
        <option value="20">20 מוצרים</option>
      </select>
      <div style="font-size: 0.78rem; color: #f44336; margin-top: 8px;">
        ⚠ דורש שה-WP REST API לא חסום ב-Vercel
      </div>
    </div>

    <div id="tab-pick" class="tab-content">
      <div class="picker-toolbar">
        <input type="text" id="pickerSearch" placeholder="חיפוש לפי שם...">
        <button type="button" onclick="loadProducts()">🔄 טען מוצרים</button>
        <button type="button" onclick="clearSelection()">נקה</button>
        <span id="pickerCount">0 נבחרו</span>
      </div>
      <div id="pickerGrid" class="picker-grid">
        <div class="picker-empty">לחץ "טען מוצרים" כדי להתחיל</div>
      </div>
    </div>

    <div class="row" style="margin-top: 20px;">
      <div>
        <label>דוגמנים — מין</label>
        <select id="gender">
          <option value="mixed" selected>👫 מעורב (גברים ונשים)</option>
          <option value="male">👨 גברים בלבד</option>
          <option value="female">👩 נשים בלבד</option>
        </select>
      </div>
      <div>
        <label>דוגמנים — גיל</label>
        <select id="age">
          <option value="adults" selected>👤 מבוגרים (22-35)</option>
          <option value="kids">👶 ילדים (6-11)</option>
          <option value="teens">🧒 נוער (13-17)</option>
          <option value="family">👨‍👩‍👧 משפחתי (הורים + ילדים)</option>
        </select>
      </div>
      <div>
        <label>סגנון צילום</label>
        <select id="photoStyle">
          <option value="candid" selected>📷 טבעי / קנדיד (מומלץ)</option>
          <option value="phone_snapshot">📱 תמונת טלפון / יום-יום</option>
          <option value="polished">✨ פרסומי-מלוטש (Nike-style)</option>
        </select>
      </div>
      <div>
        <label>סגנון רקע</label>
        <select id="style">
          <option value="stadium" selected>🏟 אצטדיון</option>
          <option value="street">🌆 רחוב עירוני</option>
          <option value="action">⚡ אימון בחוץ</option>
          <option value="locker_room">🚪 חדר הלבשה</option>
          <option value="trophy">🏆 חגיגת ניצחון</option>
          <option value="pitch">🌱 מגרש דשא</option>
          <option value="studio_dark">⚫ סטודיו כהה</option>
          <option value="studio_color">🎨 סטודיו צבעוני</option>
          <option value="graffiti">🖌️ קיר גרפיטי</option>
          <option value="sunset">🌅 שקיעה</option>
          <option value="night_city">🌃 לילה בעיר</option>
          <option value="beach">🏖️ חוף ים</option>
          <option value="fans_pov">📣 קהל אוהדים</option>
          <option value="tunnel">🚇 מנהרת השחקנים</option>
          <option value="training">🏋️ חדר כושר</option>
        </select>
      </div>
    </div>

    <div class="row">
      <div>
        <label>רזולוציה</label>
        <div style="display: flex; flex-direction: column; gap: 4px; padding: 8px 0; font-size: 0.85rem;">
          <label style="margin: 0; color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="aspect" value="1:1" checked> 1:1 ריבוע (1080×1080)
          </label>
          <label style="margin: 0; color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="aspect" value="4:5"> 4:5 פיד אנכי (1080×1350)
          </label>
          <label style="margin: 0; color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="aspect" value="9:16"> 9:16 סטורי (1080×1920)
          </label>
          <label style="margin: 0; color: #ddd; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="aspect" value="16:9"> 16:9 רוחב (1920×1080)
          </label>
        </div>
      </div>
      <div>
        <label>וריאציות</label>
        <select id="variations">
          <option value="1" selected>תמונה אחת לרזולוציה</option>
          <option value="2">2 וריאציות (פי 2 עלות)</option>
          <option value="4">4 וריאציות (פי 4 עלות)</option>
        </select>
        <div style="font-size: 0.72rem; color: #888; margin-top: 4px;">
          יוצר כמה גרסאות שונות לבחירה
        </div>
      </div>
      <div>
        <label>איכות סופית</label>
        <select id="upscale">
          <option value="1" selected>סטנדרטי (1080)</option>
          <option value="2">גבוהה — 2K (×2)</option>
          <option value="4">מקסימלית — 4K (×4)</option>
        </select>
        <div style="font-size: 0.72rem; color: #888; margin-top: 4px;">
          קבצים גדולים יותר, איכות חדה יותר
        </div>
      </div>
    </div>

    <details style="margin-top: 20px; background: #0f0f14; border: 1px solid #2a2a38; border-radius: 8px; padding: 10px 14px;">
      <summary style="cursor: pointer; color: #ccc; font-size: 0.95rem; user-select: none;">
        📝 כיתוב על התמונה — תבנית מקצועית (אופציונלי)
      </summary>
      <div style="font-size: 0.75rem; color: #888; margin-top: 8px;">
        בוחר תבנית, ממלא טקסטים. הכל ממוקם בתוך אזור שלא נחתך באינסטגרם.
      </div>
      <div id="tplGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 12px;">
        <div class="tpl-card" data-tpl="" onclick="selectTemplate(this)">
          <div class="tpl-thumb" style="background:#222; color:#666;">ללא</div>
          <div class="tpl-name">בלי כיתוב</div>
        </div>
        <div class="tpl-card" data-tpl="t1_bottom_strip" onclick="selectTemplate(this)">
          <div class="tpl-thumb">
            <div style="position:absolute; bottom:0; left:0; right:0; height:30%; background:#000; border-top:2px solid #ffd200;"></div>
          </div>
          <div class="tpl-name">רצועה תחתונה</div>
        </div>
        <div class="tpl-card" data-tpl="t2_diagonal_tag" onclick="selectTemplate(this)">
          <div class="tpl-thumb">
            <div style="position:absolute; top:8%; left:8%; width:42%; height:24%; background:#dc1e28; transform:rotate(-12deg); border:2px solid #ffe664;"></div>
          </div>
          <div class="tpl-name">תג מבצע</div>
        </div>
        <div class="tpl-card" data-tpl="t3_top_banner" onclick="selectTemplate(this)">
          <div class="tpl-thumb">
            <div style="position:absolute; top:18%; left:-10%; right:-10%; height:14%; background:#ffd200; transform:rotate(-6deg); border-top:2px solid #000; border-bottom:2px solid #000;"></div>
          </div>
          <div class="tpl-name">באנר עליון</div>
        </div>
        <div class="tpl-card" data-tpl="t4_cta_bar" onclick="selectTemplate(this)">
          <div class="tpl-thumb">
            <div style="position:absolute; bottom:0; left:0; right:0; height:24%; background:#ffd200; border-top:3px solid #000;"></div>
          </div>
          <div class="tpl-name">פס CTA צהוב</div>
        </div>
        <div class="tpl-card" data-tpl="t5_circle_badge" onclick="selectTemplate(this)">
          <div class="tpl-thumb">
            <div style="position:absolute; top:8%; right:8%; width:36%; height:50%; background:#dc1e28; border-radius:50%; border:3px solid #ffe664; transform:rotate(-8deg);"></div>
          </div>
          <div class="tpl-name">badge עגול</div>
        </div>
      </div>
      <div id="tplFields" style="display: none; margin-top: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 240px; gap: 14px; align-items: start;">
          <div>
            <div class="row">
              <div>
                <label>כותרת ראשית</label>
                <input type="text" id="tplHeadline" placeholder='למשל: מבצע!' oninput="schedulePreview()">
              </div>
              <div>
                <label>כותרת משנה</label>
                <input type="text" id="tplSubline" placeholder='למשל: סוף שבוע בלבד' oninput="schedulePreview()">
              </div>
            </div>
            <div class="row">
              <div>
                <label>מחיר</label>
                <input type="text" id="tplPrice" placeholder='למשל: ₪149' oninput="schedulePreview()">
              </div>
              <div>
                <label>CTA</label>
                <input type="text" id="tplCta" placeholder='למשל: הזמן עכשיו ›' oninput="schedulePreview()">
              </div>
            </div>
            <div style="font-size: 0.72rem; color: #888; margin-top: 6px;">
              ⓘ לא חייב למלא הכל. כל תבנית משתמשת רק בשדות הרלוונטיים לה.
            </div>
          </div>
          <div>
            <label>תצוגה מקדימה</label>
            <div id="tplPreviewBox" style="background:#0a0a0e; border:1px solid #2a2a38; border-radius:8px; overflow:hidden; min-height:140px; display:flex; align-items:center; justify-content:center; color:#666; font-size:0.8rem;">
              בחר תבנית כדי לראות תצוגה
            </div>
            <select id="tplPreviewAspect" onchange="schedulePreview()" style="margin-top:8px; font-size:0.8rem;">
              <option value="1:1" selected>תצוגה: 1:1 ריבוע</option>
              <option value="4:5">תצוגה: 4:5 פיד</option>
              <option value="9:16">תצוגה: 9:16 סטורי</option>
              <option value="16:9">תצוגה: 16:9 רוחב</option>
            </select>
          </div>
        </div>
      </div>
    </details>

    <details style="margin-top: 14px; background: #0f0f14; border: 1px solid #2a2a38; border-radius: 8px; padding: 10px 14px;">
      <summary style="cursor: pointer; color: #ccc; font-size: 0.9rem; user-select: none;">
        🏷 הגדרות לוגו (מיקום, גודל, שקיפות)
      </summary>
      <div class="row" style="margin-top: 12px;">
        <div>
          <label>מיקום</label>
          <select id="logoPos">
            <option value="top-right" selected>↗ ימין למעלה</option>
            <option value="top-left">↖ שמאל למעלה</option>
            <option value="bottom-right">↘ ימין למטה</option>
            <option value="bottom-left">↙ שמאל למטה</option>
          </select>
        </div>
        <div>
          <label>גודל: <span id="logoSizeVal">18%</span></label>
          <input type="range" id="logoSize" min="8" max="35" value="18" step="1"
                 oninput="document.getElementById('logoSizeVal').textContent=this.value+'%'"
                 style="width:100%; accent-color:#ffd200;">
        </div>
        <div>
          <label>שקיפות: <span id="logoOpacityVal">100%</span></label>
          <input type="range" id="logoOpacity" min="30" max="100" value="100" step="5"
                 oninput="document.getElementById('logoOpacityVal').textContent=this.value+'%'"
                 style="width:100%; accent-color:#ffd200;">
        </div>
      </div>
    </details>

    <div style="display: flex; gap: 8px; margin-top: 18px;">
      <button type="button" id="runBtn" onclick="generate()" style="flex:2;">🚀 צור מודעות</button>
      <button type="button" id="regenBtn" onclick="regenerate()" style="flex:1; display:none; background:#444; color:#fff; padding:13px; font-size:0.95rem; font-weight:600; border:none; border-radius:8px; cursor:pointer;">🔁 תייצר שוב</button>
    </div>
    <div id="status"></div>
  </form>

  <div id="logBox"></div>

  <div id="results">
    <h2>✅ תמונות מוכנות</h2>
    <div class="grid" id="grid"></div>
  </div>

  <!-- Background swap modal -->
  <div id="bgSwapModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:1000; align-items:center; justify-content:center; padding:20px;">
    <div style="background:#1a1a24; border:1px solid #2a2a38; border-radius:12px; padding:24px; max-width:480px; width:100%;">
      <h2 style="margin:0 0 6px 0; font-size:1.2rem;">🔄 החלף רקע</h2>
      <p style="color:#aaa; font-size:0.85rem; margin:0 0 16px 0;">משאיר את הדוגמנים והחולצות זהים, מחליף רק את הרקע. עלות: ~$0.04</p>
      <label>רקע חדש</label>
      <select id="bgSwapStyle">
        <option value="stadium">🏟 אצטדיון</option>
        <option value="street">🌆 רחוב עירוני</option>
        <option value="action">⚡ אימון בחוץ</option>
        <option value="locker_room">🚪 חדר הלבשה</option>
        <option value="trophy">🏆 חגיגת ניצחון</option>
        <option value="pitch">🌱 מגרש דשא</option>
        <option value="studio_dark">⚫ סטודיו כהה</option>
        <option value="studio_color">🎨 סטודיו צבעוני</option>
        <option value="graffiti">🖌️ קיר גרפיטי</option>
        <option value="sunset">🌅 שקיעה</option>
        <option value="night_city">🌃 לילה בעיר</option>
        <option value="beach">🏖️ חוף ים</option>
        <option value="fans_pov">📣 קהל אוהדים</option>
        <option value="tunnel">🚇 מנהרת השחקנים</option>
        <option value="training">🏋️ חדר כושר</option>
      </select>
      <label style="margin-top:12px;">הנחיה נוספת (אופציונלי)</label>
      <input type="text" id="bgSwapPrompt" placeholder="למשל: שעת בוקר מוקדמת">
      <div style="display:flex; gap:8px; margin-top:18px;">
        <button type="button" onclick="runBgSwap()" id="bgSwapBtn" style="flex:1; background:#ffd200; color:#0f0f14; border:none; padding:11px; border-radius:8px; cursor:pointer; font-weight:700;">🔄 החלף רקע</button>
        <button type="button" onclick="closeBgSwap()" style="background:#2a2a38; border:1px solid #3a3a48; color:#ccc; padding:11px 18px; border-radius:8px; cursor:pointer;">ביטול</button>
      </div>
      <div id="bgSwapStatus" style="margin-top:10px; color:#ffd200; font-size:0.85rem; min-height:1.2em;"></div>
    </div>
  </div>

  <details style="margin-top: 22px;" id="copyPanel">
    <summary style="cursor: pointer; color: #ccc; font-size: 1rem; user-select: none; padding: 6px 0;">
      ✍️ קופי שיווקי בעברית — מוכן להעתקה למטא אדס
    </summary>
    <div style="margin-top: 12px;">
      <button type="button" onclick="generateCopy()" id="copyBtn"
              style="background:#9c27b0; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-size:0.9rem; font-weight:600;">
        ✍️ צור 5 גרסאות קופי
      </button>
      <span id="copyStatus" style="margin-right: 10px; color:#aaa; font-size:0.85rem;"></span>
      <div id="copyResults" style="margin-top: 14px;"></div>
    </div>
  </details>

  <details style="margin-top: 28px;">
    <summary style="cursor: pointer; color: #ccc; font-size: 1rem; user-select: none; padding: 6px 0;">
      🕐 היסטוריה — כל התמונות שיצרת <span id="histCount" style="color:#888;">(?)</span>
    </summary>
    <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <input type="text" id="histSearch" placeholder="חיפוש לפי סגנון/רזולוציה..." oninput="renderHistory()" style="flex:1; min-width:200px;">
      <button type="button" id="histFavBtn" onclick="toggleHistFavs()" style="background:#2a2a38; border:1px solid #3a3a48; color:#ccc; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">☆ הצג מועדפים בלבד</button>
      <button type="button" onclick="loadHistory()" style="background:#2a2a38; border:1px solid #3a3a48; color:#ccc; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;">🔄 רענן</button>
    </div>
    <div class="grid" id="histGrid" style="margin-top: 14px;"></div>
  </details>
</div>

<script>
let evtSource = null;
let allProducts = [];
let selectedIds = new Set();
let currentTab = 'upload';
let uploadedFiles = []; // [{file, name, price, dataUrl}]
let lastJobParams = null; // {tab, files, prompt, style, gender, aspects, ids, limit}

function switchTab(ev, tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  ev.target.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// ── Drag & drop ────────────────────────────────────────────
const dz = () => document.getElementById('dropzone');
document.addEventListener('DOMContentLoaded', () => {
  const z = dz();
  ['dragover','dragenter'].forEach(e => z.addEventListener(e, ev => {ev.preventDefault(); z.classList.add('drag');}));
  ['dragleave','drop'].forEach(e => z.addEventListener(e, ev => {ev.preventDefault(); z.classList.remove('drag');}));
  z.addEventListener('drop', ev => addFiles(ev.dataTransfer.files));
  document.getElementById('pickerSearch').addEventListener('input', renderProducts);
});

function addFiles(files) {
  [...files].forEach(f => {
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      uploadedFiles.push({file: f, name: baseName, price: '', dataUrl: e.target.result});
      renderUploadList();
    };
    reader.readAsDataURL(f);
  });
}

function renderUploadList() {
  const list = document.getElementById('uploadList');
  list.innerHTML = '';
  uploadedFiles.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'upload-row';
    row.innerHTML = `
      <img src="${item.dataUrl}">
      <div class="fields">
        <input type="text" class="name-fld" placeholder="שם המוצר" value="${item.name.replace(/"/g,'&quot;')}" oninput="uploadedFiles[${i}].name=this.value">
        <input type="text" class="price-fld" placeholder="מחיר ₪" value="${item.price}" oninput="uploadedFiles[${i}].price=this.value">
      </div>
      <button class="remove" onclick="removeFile(${i})" title="הסר">✕</button>`;
    list.appendChild(row);
  });
}

function removeFile(i) {
  uploadedFiles.splice(i, 1);
  renderUploadList();
}

function setPrompt(el) {
  document.getElementById('adText').value = el.textContent;
  document.querySelectorAll('.ex-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

let selectedTpl = '';
function selectTemplate(el) {
  selectedTpl = el.getAttribute('data-tpl') || '';
  document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tplFields').style.display = selectedTpl ? 'block' : 'none';
  if (selectedTpl) schedulePreview();
}

let _previewTimer = null;
function schedulePreview() {
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = setTimeout(updatePreview, 350);
}

function updatePreview() {
  const box = document.getElementById('tplPreviewBox');
  if (!selectedTpl) {
    box.innerHTML = '<span>בחר תבנית כדי לראות תצוגה</span>';
    return;
  }
  const aspect = document.getElementById('tplPreviewAspect').value;
  const params = new URLSearchParams({
    template: selectedTpl,
    aspect: aspect,
    headline: document.getElementById('tplHeadline').value,
    subline:  document.getElementById('tplSubline').value,
    price:    document.getElementById('tplPrice').value,
    cta:      document.getElementById('tplCta').value,
    _t: Date.now(),
  });
  box.innerHTML = '<img src="/template_preview?' + params + '" style="max-width:100%; max-height:300px; display:block;" alt="preview">';
}
// Default: first card (no template)
document.addEventListener('DOMContentLoaded', () => {
  const first = document.querySelector('.tpl-card[data-tpl=""]');
  if (first) first.classList.add('active');
});

// ── Saved jersey library ──────────────────────────────────────
let libraryItems = [];
let selectedLibIds = new Set();

async function loadLibrary() {
  try {
    const r = await fetch('/library');
    const d = await r.json();
    libraryItems = d.items || [];
    renderLibrary();
  } catch (e) { console.error(e); }
}

function renderLibrary() {
  const grid = document.getElementById('libGrid');
  document.getElementById('libCount').textContent = '(' + libraryItems.length + ')';
  if (!libraryItems.length) {
    grid.innerHTML = '<div class="picker-empty" style="font-size:0.8rem;">הספרייה ריקה — הוסף חולצות שאתה משתמש בהן הרבה</div>';
    return;
  }
  grid.innerHTML = '';
  libraryItems.forEach(it => {
    const div = document.createElement('div');
    div.className = 'product' + (selectedLibIds.has(it.id) ? ' selected' : '');
    div.innerHTML = `
      <div class="check">${selectedLibIds.has(it.id) ? '✓' : ''}</div>
      <img src="/library/img/${it.id}" loading="lazy">
      <div class="info">${it.name}</div>
      <div class="price"><a href="#" onclick="deleteLibItem('${it.id}', event); return false;" style="color:#f44336; font-size:0.7rem; text-decoration:none;">🗑 מחק</a></div>`;
    div.onclick = (e) => { if (e.target.tagName === 'A') return; toggleLibItem(it.id); };
    grid.appendChild(div);
  });
}

function toggleLibItem(id) {
  if (selectedLibIds.has(id)) selectedLibIds.delete(id); else selectedLibIds.add(id);
  renderLibrary();
}

async function addToLibrary(files) {
  for (const f of files) {
    const name = prompt('שם החולצה:', f.name.replace(/\.[^.]+$/, ''));
    if (!name) continue;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('name', name);
    await fetch('/library', {method: 'POST', body: fd});
  }
  document.getElementById('libFileInput').value = '';
  loadLibrary();
}

async function deleteLibItem(id, ev) {
  ev.stopPropagation();
  if (!confirm('למחוק מהספרייה?')) return;
  await fetch('/library/' + id, {method: 'DELETE'});
  selectedLibIds.delete(id);
  loadLibrary();
}

loadLibrary();

// ── History gallery ───────────────────────────────────────────
let historyItems = [];

async function loadHistory() {
  try {
    const r = await fetch('/history');
    const d = await r.json();
    historyItems = d.items || [];
    favoritesSet = new Set(d.favorites || []);
    renderHistory();
  } catch (e) { console.error(e); }
}

let historyShowFavsOnly = false;
function toggleHistFavs() {
  historyShowFavsOnly = !historyShowFavsOnly;
  document.getElementById('histFavBtn').textContent = historyShowFavsOnly ? '★ מציג מועדפים' : '☆ הצג מועדפים בלבד';
  renderHistory();
}

function renderHistory() {
  const search = (document.getElementById('histSearch').value || '').toLowerCase();
  const grid = document.getElementById('histGrid');
  const filtered = historyItems.filter(it => {
    if (historyShowFavsOnly && !it.favorite) return false;
    if (!search) return true;
    return (it.style || '').toLowerCase().includes(search) ||
           (it.aspect || '').includes(search) ||
           (it.file || '').toLowerCase().includes(search);
  });
  document.getElementById('histCount').textContent = '(' + historyItems.length + ')';
  if (!filtered.length) { grid.innerHTML = '<div class="picker-empty">אין תמונות עדיין</div>'; return; }
  grid.innerHTML = '';
  filtered.forEach(it => {
    const date = new Date(it.ts * 1000).toLocaleString('he-IL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
    grid.appendChild(buildImageCard(it.file, date));
  });
}

loadHistory();

// ── Hebrew copy generator ─────────────────────────────────────
async function generateCopy() {
  const btn = document.getElementById('copyBtn');
  const stat = document.getElementById('copyStatus');
  const out = document.getElementById('copyResults');
  btn.disabled = true;
  stat.textContent = 'יוצר... ~10 שניות';
  out.innerHTML = '';
  try {
    const jerseyNames = uploadedFiles.map(f => f.name).filter(n => n);
    libraryItems.forEach(it => { if (selectedLibIds.has(it.id)) jerseyNames.push(it.name); });
    const style = document.getElementById('style').value;
    const userPrompt = document.getElementById('adText').value.trim();
    const r = await fetch('/copy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({jersey_names: jerseyNames, style, user_prompt: userPrompt}),
    });
    const data = await r.json();
    btn.disabled = false;
    if (data.error) { stat.textContent = '❌ ' + data.error; return; }
    const variants = data.variants || [];
    if (!variants.length) { stat.textContent = 'לא הצלחתי לייצר גרסאות'; return; }
    stat.textContent = '✅ ' + variants.length + ' גרסאות';
    variants.forEach((v, i) => {
      const tags = (v.hashtags || []).join(' ');
      const fullText = (v.headline || '') + '\n\n' + (v.subline || '') + '\n\n' + (v.cta || '') + '\n\n' + tags;
      const card = document.createElement('div');
      card.className = 'copy-card';
      const fullEsc = JSON.stringify(fullText).replace(/"/g,'&quot;');
      const headEsc = JSON.stringify(v.headline || '').replace(/"/g,'&quot;');
      const tagsEsc = JSON.stringify(tags).replace(/"/g,'&quot;');
      card.innerHTML =
        '<div class="copy-vibe">' + (v.vibe || ('גרסה ' + (i+1))) + '</div>' +
        '<div class="copy-headline">' + escapeHtml(v.headline || '') + '</div>' +
        '<div class="copy-subline">' + escapeHtml(v.subline || '') + '</div>' +
        '<div class="copy-cta">' + escapeHtml(v.cta || '') + '</div>' +
        '<div class="copy-hashtags">' + escapeHtml(tags) + '</div>' +
        '<div class="copy-actions">' +
          '<button class="copy-btn" onclick="copyText(this, ' + fullEsc + ')">📋 העתק הכל</button>' +
          '<button class="copy-btn" onclick="copyText(this, ' + headEsc + ')">📋 כותרת</button>' +
          '<button class="copy-btn" onclick="copyText(this, ' + tagsEsc + ')">📋 hashtags</button>' +
        '</div>';
      out.appendChild(card);
    });
  } catch (e) {
    btn.disabled = false;
    stat.textContent = '❌ ' + e.message;
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

async function copyText(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.classList.add('copied');
    btn.textContent = '✓ הועתק';
    setTimeout(() => { btn.classList.remove('copied'); btn.textContent = orig; }, 1500);
  } catch (e) { alert('שגיאה בהעתקה'); }
}

async function refreshStats() {
  try {
    const r = await fetch('/stats');
    const d = await r.json();
    document.getElementById('stToday').textContent  = d.today + ' תמונות';
    document.getElementById('stMonth').textContent  = d.month + ' תמונות';
    document.getElementById('stTotal').textContent  = d.total + ' תמונות';
    document.getElementById('stCost').textContent   = '~₪' + (d.month_cost_ils || 0);
  } catch (e) {}
}
refreshStats();
setInterval(refreshStats, 30000);

async function loadProducts() {
  const grid = document.getElementById('pickerGrid');
  grid.innerHTML = '<div class="picker-empty"><span class="spinner"></span> טוען מוצרים...</div>';
  try {
    const r = await fetch('/products?per_page=100');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (data.error) { grid.innerHTML = '<div class="picker-empty">❌ ' + data.error + '</div>'; return; }
    allProducts = data.products || [];
    renderProducts();
  } catch (e) {
    grid.innerHTML = '<div class="picker-empty">❌ שגיאה: ' + e.message + '</div>';
  }
}

function renderProducts() {
  const search = (document.getElementById('pickerSearch').value || '').toLowerCase();
  const grid = document.getElementById('pickerGrid');
  const filtered = allProducts.filter(p => !search || p.name.toLowerCase().includes(search));
  if (!filtered.length) { grid.innerHTML = '<div class="picker-empty">לא נמצאו מוצרים</div>'; return; }
  grid.innerHTML = '';
  filtered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product' + (selectedIds.has(p.id) ? ' selected' : '');
    div.onclick = () => toggleProduct(p.id);
    div.innerHTML = `
      <div class="check">${selectedIds.has(p.id) ? '✓' : ''}</div>
      <img src="${p.image || ''}" loading="lazy" onerror="this.style.background='#333'">
      <div class="info">${p.name}</div>
      <div class="price">${p.price ? '₪' + p.price : ''}</div>`;
    grid.appendChild(div);
  });
}

function toggleProduct(id) {
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  document.getElementById('pickerCount').textContent = selectedIds.size + ' נבחרו';
  renderProducts();
}

function clearSelection() {
  selectedIds.clear();
  document.getElementById('pickerCount').textContent = '0 נבחרו';
  renderProducts();
}

async function regenerate() {
  if (!lastJobParams) return;
  // Restore the form to last params and run
  document.getElementById('adText').value = lastJobParams.prompt || '';
  document.getElementById('style').value = lastJobParams.style;
  document.getElementById('gender').value = lastJobParams.gender;
  document.getElementById('age').value = lastJobParams.age || 'adults';
  document.getElementById('photoStyle').value = lastJobParams.photoStyle || 'candid';
  document.querySelectorAll('input[name=aspect]').forEach(c => {
    c.checked = (lastJobParams.aspects || []).includes(c.value);
  });
  if (lastJobParams.tab === 'upload' && lastJobParams.files) {
    uploadedFiles = lastJobParams.files;
    renderUploadList();
  }
  currentTab = lastJobParams.tab;
  generate();
}

async function generate() {
  const userPrompt = document.getElementById('adText').value.trim(); // optional
  const style = document.getElementById('style').value;
  const gender = document.getElementById('gender').value;
  const age = document.getElementById('age').value;
  const photoStyle = document.getElementById('photoStyle').value;
  const aspects = [...document.querySelectorAll('input[name=aspect]:checked')].map(c => c.value);
  if (!aspects.length) { alert('בחר לפחות רזולוציה אחת'); return; }

  const variations = document.getElementById('variations').value;
  const upscale    = document.getElementById('upscale').value;
  const logoPos     = document.getElementById('logoPos').value;
  const logoSize    = document.getElementById('logoSize').value;
  const logoOpacity = document.getElementById('logoOpacity').value;
  // Snapshot params for regeneration
  lastJobParams = {
    tab: currentTab, prompt: userPrompt, style, gender, age, photoStyle, aspects, variations,
    logoPos, logoSize, logoOpacity,
    files: currentTab === 'upload' ? [...uploadedFiles] : null,
    ids: currentTab === 'pick' ? [...selectedIds] : null,
    limit: currentTab === 'top' ? document.getElementById('limit').value : null,
  };

  document.getElementById('runBtn').disabled = true;
  document.getElementById('status').textContent = 'מתחבר...';
  const log = document.getElementById('logBox');
  log.style.display = 'block';
  log.innerHTML = '';
  document.getElementById('results').style.display = 'none';

  let streamUrl;
  if (currentTab === 'upload') {
    if (!uploadedFiles.length && !selectedLibIds.size) {
      alert('הוסף לפחות תמונה אחת (מהמחשב או מהספרייה)');
      document.getElementById('runBtn').disabled = false; return;
    }
    document.getElementById('status').textContent = 'מעלה תמונות...';
    const fd = new FormData();
    uploadedFiles.forEach((it, i) => fd.append('file_' + i, it.file));
    if (selectedLibIds.size) fd.append('lib_ids', [...selectedLibIds].join(','));
    try {
      const r = await fetch('/upload', {method: 'POST', body: fd});
      const data = await r.json();
      if (!data.job_id) throw new Error(data.error || 'upload failed');
      streamUrl = '/stream_upload?' + new URLSearchParams({
        job_id: data.job_id, prompt: userPrompt, style, gender, age,
        photo_style: photoStyle, variations, upscale,
        logo_pos: logoPos, logo_size: logoSize, logo_opacity: logoOpacity,
        template: selectedTpl,
        tpl_headline: document.getElementById('tplHeadline').value,
        tpl_subline:  document.getElementById('tplSubline').value,
        tpl_price:    document.getElementById('tplPrice').value,
        tpl_cta:      document.getElementById('tplCta').value,
        aspects: aspects.join(',')
      });
    } catch (e) {
      document.getElementById('status').textContent = '❌ ' + e.message;
      document.getElementById('runBtn').disabled = false; return;
    }
  } else {
    const params = new URLSearchParams({prompt: userPrompt, style, gender, aspects: aspects.join(',')});
    if (currentTab === 'pick') {
      if (!selectedIds.size) {
        alert('בחר לפחות מוצר אחד');
        document.getElementById('runBtn').disabled = false; return;
      }
      params.set('ids', [...selectedIds].join(','));
    } else {
      params.set('limit', document.getElementById('limit').value);
    }
    streamUrl = '/stream?' + params;
  }

  evtSource = new EventSource(streamUrl);

  evtSource.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.log !== undefined) {
      const line = document.createElement('div');
      if (d.log.includes('שגיאה') || d.log.includes('✗') || d.log.toLowerCase().includes('error')) {
        line.className = 'err';
      }
      line.textContent = d.log;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }
    if (d.status) {
      document.getElementById('status').textContent = d.status;
    }
    if (d.done) {
      evtSource.close();
      document.getElementById('runBtn').disabled = false;
      document.getElementById('regenBtn').style.display = 'block';
      document.getElementById('status').textContent = '✅ הסתיים — לא מוצא חן? לחץ "תייצר שוב"';
      showImages(d.images);
      refreshStats();
      loadHistory();
    }
    if (d.error) {
      evtSource.close();
      document.getElementById('runBtn').disabled = false;
      document.getElementById('status').textContent = '❌ ' + d.error;
    }
  };

  evtSource.onerror = () => {
    evtSource.close();
    document.getElementById('runBtn').disabled = false;
    document.getElementById('status').textContent = '❌ שגיאת חיבור';
  };
}

let favoritesSet = new Set();

function aspectBadge(name) {
  if (name.includes('_1x1_')) return '1:1';
  if (name.includes('_4x5_')) return '4:5';
  if (name.includes('_9x16_')) return '9:16';
  if (name.includes('_16x9_')) return '16:9';
  return '?';
}

function buildImageCard(name, dateStr) {
  const aspect = aspectBadge(name);
  const isFav = favoritesSet.has(name);
  const card = document.createElement('div');
  card.className = 'img-card';
  card.dataset.file = name;
  const safeName = name.replace(/'/g,"\\'");
  card.innerHTML =
    '<div class="img-actions">' +
      '<button class="ico-btn fav-btn ' + (isFav ? 'on' : '') + '" title="שמור כמועדף" onclick="toggleFav(\'' + safeName + '\', this, event)">' + (isFav ? '★' : '☆') + '</button>' +
      '<button class="ico-btn bg-btn" title="החלף רקע" onclick="openBgSwap(\'' + safeName + '\', event)">🔄</button>' +
      '<button class="ico-btn del-btn" title="מחק" onclick="deleteImg(\'' + safeName + '\', this, event)">🗑</button>' +
    '</div>' +
    '<img src="/img/' + encodeURIComponent(name) + '" loading="lazy" onclick="window.open(this.src)" title="' + name + '">' +
    '<div class="img-label">' +
      '<span class="badge">' + aspect + '</span>' +
      (dateStr ? '<span style="font-size:0.72rem; color:#666;">' + dateStr + '</span>' : '') +
      '<a href="/img/' + encodeURIComponent(name) + '" download="' + name + '">⬇</a>' +
    '</div>';
  return card;
}

function showImages(images) {
  if (!images || !images.length) return;
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  images.forEach(name => grid.appendChild(buildImageCard(name)));
  document.getElementById('results').style.display = 'block';
}

async function toggleFav(name, btn, ev) {
  ev.stopPropagation();
  const isFav = favoritesSet.has(name);
  await fetch('/favorites/' + encodeURIComponent(name), {method: isFav ? 'DELETE' : 'POST'});
  if (isFav) { favoritesSet.delete(name); btn.classList.remove('on'); btn.textContent = '☆'; }
  else { favoritesSet.add(name); btn.classList.add('on'); btn.textContent = '★'; }
}

async function deleteImg(name, btn, ev) {
  ev.stopPropagation();
  if (!confirm('למחוק לצמיתות?\n' + name)) return;
  await fetch('/img/' + encodeURIComponent(name), {method: 'DELETE'});
  const card = btn.closest('.img-card');
  if (card) card.remove();
  favoritesSet.delete(name);
  refreshStats();
  loadHistory();
}

// ── Background swap ─────────────────────────────────────────
let _bgSwapFile = '';
function openBgSwap(name, ev) {
  ev.stopPropagation();
  _bgSwapFile = name;
  document.getElementById('bgSwapStatus').textContent = '';
  document.getElementById('bgSwapPrompt').value = '';
  document.getElementById('bgSwapModal').style.display = 'flex';
}
function closeBgSwap() {
  document.getElementById('bgSwapModal').style.display = 'none';
}
async function runBgSwap() {
  const btn = document.getElementById('bgSwapBtn');
  const status = document.getElementById('bgSwapStatus');
  btn.disabled = true;
  status.textContent = '⏳ מחליף רקע... ~10-15 שניות';
  try {
    const r = await fetch('/swap_bg', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        file: _bgSwapFile,
        style: document.getElementById('bgSwapStyle').value,
        prompt: document.getElementById('bgSwapPrompt').value,
      }),
    });
    const data = await r.json();
    btn.disabled = false;
    if (data.error) { status.textContent = '❌ ' + data.error; return; }
    status.textContent = '✅ ' + data.new_file;
    refreshStats();
    loadHistory();
    setTimeout(closeBgSwap, 1500);
    // Show the new image at the top of results
    const grid = document.getElementById('grid');
    if (grid) grid.insertBefore(buildImageCard(data.new_file), grid.firstChild);
    document.getElementById('results').style.display = 'block';
  } catch (e) {
    btn.disabled = false;
    status.textContent = '❌ ' + e.message;
  }
}
</script>
</body>
</html>"""

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(HTML, logo_present=LOGO_PATH.exists())


@app.route("/img/<path:filename>")
def serve_image(filename):
    return send_from_directory(OUTPUT_DIR, filename)


FAVORITES_PATH = ROOT / "favorites.json"


def _load_favs() -> set:
    if not FAVORITES_PATH.exists():
        return set()
    try:
        return set(json.loads(FAVORITES_PATH.read_text(encoding="utf-8")))
    except Exception:
        return set()


def _save_favs(s: set):
    FAVORITES_PATH.write_text(json.dumps(sorted(s), ensure_ascii=False), encoding="utf-8")


@app.route("/img/<path:filename>", methods=["DELETE"])
def delete_image(filename):
    p = OUTPUT_DIR / filename
    if p.exists() and p.is_file():
        try:
            p.unlink()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    favs = _load_favs()
    favs.discard(filename)
    _save_favs(favs)
    return jsonify({"ok": True})


@app.route("/favorites", methods=["GET"])
def favorites_list():
    return jsonify({"items": sorted(_load_favs())})


@app.route("/favorites/<path:filename>", methods=["POST", "DELETE"])
def favorites_toggle(filename):
    favs = _load_favs()
    if request.method == "POST":
        favs.add(filename)
    else:
        favs.discard(filename)
    _save_favs(favs)
    return jsonify({"ok": True, "favorited": filename in favs})


@app.route("/stats")
def stats():
    return jsonify(get_stats_summary())


def _make_placeholder(aspect: str, base_image_path: Path = None) -> bytes:
    """Build a preview-base image: real recent generation if available, else a gradient placeholder."""
    from PIL import Image, ImageDraw
    import io as _io
    target = ASPECT_DESC.get(aspect, ASPECT_DESC["1:1"])[1]
    # Prefer last generated image of any aspect — looks much more realistic than a gradient
    if base_image_path is None:
        candidates = sorted(OUTPUT_DIR.glob("ad_*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
        if candidates:
            base_image_path = candidates[0]
    if base_image_path and base_image_path.exists():
        # Reuse fit_to_aspect to crop to the target ratio
        from generate_meta_ads import fit_to_aspect
        return fit_to_aspect(base_image_path.read_bytes(), aspect)
    # Fallback gradient
    img = Image.new("RGB", target, (0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(target[1]):
        t = y / target[1]
        r = int(20 + (60 - 20) * t)
        g = int(30 + (80 - 30) * t)
        b = int(50 + (130 - 50) * t)
        draw.rectangle([(0, y), (target[0], y + 1)], fill=(r, g, b))
    buf = _io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


@app.route("/template_preview")
def template_preview():
    """Return a small JPEG preview of a template applied to a placeholder/last-generation."""
    from ad_templates import apply_template
    from PIL import Image
    import io as _io
    template_id = request.args.get("template", "")
    aspect = request.args.get("aspect", "1:1")
    fields = {
        "headline": request.args.get("headline", ""),
        "subline":  request.args.get("subline", ""),
        "price":    request.args.get("price", ""),
        "cta":      request.args.get("cta", ""),
    }
    base = _make_placeholder(aspect)
    if template_id:
        base = apply_template(template_id, base, aspect, fields)
    # Downscale to small preview (max 480 on longest edge)
    img = Image.open(_io.BytesIO(base)).convert("RGB")
    max_side = 480
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.LANCZOS)
    out = _io.BytesIO()
    img.save(out, format="JPEG", quality=85, optimize=True)
    return Response(out.getvalue(), mimetype="image/jpeg",
                    headers={"Cache-Control": "no-cache"})


@app.route("/swap_bg", methods=["POST"])
def swap_bg():
    """Swap the background on an existing image. Body: {file: 'name.jpg', style: 'beach', prompt: ''}."""
    payload = request.get_json(silent=True) or {}
    fname = payload.get("file", "")
    new_style = payload.get("style", "stadium")
    user_prompt = payload.get("prompt", "") or ""
    src = OUTPUT_DIR / fname
    if not src.exists() or not fname.startswith("ad_"):
        return jsonify({"error": "file not found"}), 400
    try:
        new_bytes = swap_background(src.read_bytes(), new_style, user_prompt)
        log_generation("bg-swap", new_style, 0)
        # Save under a new filename, preserve aspect tag
        parts = src.stem.split("_")
        aspect_tag = parts[2] if len(parts) >= 3 else "1x1"
        ts = int(time.time())
        new_fname = f"ad_{ts}_{aspect_tag}_{new_style}_bgswap.jpg"
        (OUTPUT_DIR / new_fname).write_bytes(new_bytes)
        return jsonify({"ok": True, "new_file": new_fname})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/copy", methods=["POST"])
def copy_generate():
    """Generate Hebrew marketing copy variants via Gemini Flash."""
    payload = request.get_json(silent=True) or {}
    jersey_names = [n for n in (payload.get("jersey_names") or []) if n]
    style        = payload.get("style", "stadium")
    user_prompt  = payload.get("user_prompt", "") or ""
    try:
        variants = generate_marketing_copy(jersey_names, style, user_prompt, n=5)
        return jsonify({"variants": variants})
    except Exception as e:
        return jsonify({"error": str(e), "variants": []}), 200


@app.route("/history")
def history():
    """Return all generated images, newest first, with parsed metadata."""
    favs = _load_favs()
    items = []
    for p in OUTPUT_DIR.glob("ad_*.jpg"):
        parts = p.stem.split("_")
        meta = {"file": p.name, "ts": p.stat().st_mtime,
                "size_kb": p.stat().st_size // 1024,
                "favorite": p.name in favs}
        if len(parts) >= 4:
            meta["unix_ts"] = parts[1]
            meta["aspect"] = parts[2].replace("x", ":")
            meta["style"] = parts[3]
            meta["variation"] = parts[4] if len(parts) >= 5 else ""
        items.append(meta)
    items.sort(key=lambda x: x["ts"], reverse=True)
    return jsonify({"items": items[:200], "favorites": sorted(favs)})


# ── Saved jersey library ──────────────────────────────────────────────────────
@app.route("/library", methods=["GET"])
def library_list():
    items = _load_library()
    return jsonify({"items": items})


@app.route("/library", methods=["POST"])
def library_add():
    f = request.files.get("file")
    name = (request.form.get("name", "") or (f.filename if f else "")).strip()
    if not f or not name:
        return jsonify({"error": "missing file or name"}), 400
    item_id = uuid.uuid4().hex[:10]
    ext = Path(f.filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    path = LIBRARY_DIR / f"{item_id}{ext}"
    path.write_bytes(f.read())
    items = _load_library()
    items.append({"id": item_id, "name": name, "file": path.name,
                  "ts": datetime.now().isoformat(timespec="seconds")})
    _save_library(items)
    return jsonify({"ok": True, "id": item_id})


@app.route("/library/<item_id>", methods=["DELETE"])
def library_delete(item_id):
    items = _load_library()
    keep = []
    for it in items:
        if it["id"] == item_id:
            try: (LIBRARY_DIR / it["file"]).unlink()
            except FileNotFoundError: pass
        else:
            keep.append(it)
    _save_library(keep)
    return jsonify({"ok": True})


@app.route("/library/img/<item_id>")
def library_image(item_id):
    for it in _load_library():
        if it["id"] == item_id:
            return send_from_directory(LIBRARY_DIR, it["file"])
    return "not found", 404


@app.route("/products")
def list_products():
    """Fetch products list for the picker UI."""
    per_page = request.args.get("per_page", "100")
    try:
        r = requests.get(
            f"{WOO_URL}/wp-json/wc/v3/products",
            params={"orderby": "popularity", "order": "desc",
                    "per_page": per_page, "status": "publish"},
            auth=(WOO_KEY, WOO_SECRET),
            headers={"User-Agent": UA, "Accept": "application/json"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        skip_kw = ["מיסטרי בוקס", "צעיף", "צעיפים", "גרביים"]
        products = []
        for p in data:
            name = p.get("name", "")
            if any(kw in name for kw in skip_kw):
                continue
            imgs = p.get("images", [])
            img = imgs[0]["src"] if imgs else ""
            price_raw = p.get("sale_price") or p.get("regular_price") or p.get("price") or ""
            try:
                price = str(int(float(price_raw))) if price_raw else ""
            except ValueError:
                price = price_raw
            products.append({"id": p["id"], "name": name, "image": img, "price": price})
        return jsonify({"products": products})
    except requests.HTTPError as e:
        return jsonify({"error": f"WooCommerce {e.response.status_code}: {e.response.text[:120]}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 200


@app.route("/stream")
def stream():
    text  = request.args.get("text", "")
    limit = request.args.get("limit", "5")
    style = request.args.get("style", "stadium")
    ids   = request.args.get("ids", "")

    def generate():
        if not text:
            yield f"data: {json.dumps({'error': 'חסר טקסט'})}\n\n"
            return

        script = ROOT / "generate_meta_ads.py"
        cmd = [sys.executable, str(script), "--text", text, "--style", style]
        if ids:
            cmd += ["--ids", ids]
        else:
            cmd += ["--limit", limit]
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        n_label = f"{len(ids.split(','))} נבחרים" if ids else f"{limit} פופולריים"
        yield f"data: {json.dumps({'status': f'מתחיל... ({n_label})'})}\n\n"

        # Track which images exist before the run
        before = set(OUTPUT_DIR.glob("*.jpg"))

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(ROOT),
                encoding="utf-8",
                errors="replace",
            )
            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    yield f"data: {json.dumps({'log': line})}\n\n"
            proc.wait()
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Collect new images (sorted by name so square comes before story)
        after = set(OUTPUT_DIR.glob("*.jpg"))
        new_images = sorted(
            [f.name for f in (after - before)],
            key=lambda n: (n.rsplit("_", 1)[0], n)  # group by product, square first
        )
        yield f"data: {json.dumps({'done': True, 'images': new_images, 'status': f'✅ הסתיים — {len(new_images)} תמונות'})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Upload mode ────────────────────────────────────────────────────────────────
@app.route("/upload", methods=["POST"])
def upload_files():
    """Accept fresh uploads (file_0, file_1, …) AND/OR library IDs (lib_ids)."""
    items = []
    keys = sorted([k for k in request.files.keys() if k.startswith("file_")],
                  key=lambda k: int(k.split("_")[-1]))
    for k in keys:
        f = request.files[k]
        if not f.filename:
            continue
        items.append(f.read())
    # Library IDs
    lib_ids = (request.form.get("lib_ids", "") or "").split(",")
    lib_ids = [x.strip() for x in lib_ids if x.strip()]
    if lib_ids:
        lib_index = {it["id"]: it for it in _load_library()}
        for lid in lib_ids:
            it = lib_index.get(lid)
            if it:
                p = LIBRARY_DIR / it["file"]
                if p.exists():
                    items.append(p.read_bytes())
    if not items:
        return jsonify({"error": "no files"}), 400
    job_id = uuid.uuid4().hex[:12]
    UPLOAD_JOBS[job_id] = {"files": items, "ts": time.time()}
    return jsonify({"job_id": job_id, "count": len(items)})


@app.route("/stream_upload")
def stream_upload():
    job_id      = request.args.get("job_id", "")
    user_prompt = request.args.get("prompt", "")
    style       = request.args.get("style", "stadium")
    gender      = request.args.get("gender", "mixed")
    age         = request.args.get("age", "adults")
    photo_style = request.args.get("photo_style", "candid")
    aspects_str = request.args.get("aspects", "1:1")
    try:
        variations = max(1, min(4, int(request.args.get("variations", "1"))))
    except ValueError:
        variations = 1
    logo_pos     = request.args.get("logo_pos", "top-right")
    try:
        logo_size_pct = max(8, min(35, int(request.args.get("logo_size", "18")))) / 100.0
    except ValueError:
        logo_size_pct = 0.18
    try:
        logo_opacity = max(30, min(100, int(request.args.get("logo_opacity", "100")))) / 100.0
    except ValueError:
        logo_opacity = 1.0
    try:
        upscale_factor = int(request.args.get("upscale", "1"))
    except ValueError:
        upscale_factor = 1
    upscale_factor = 1 if upscale_factor not in (1, 2, 4) else upscale_factor
    template_id   = request.args.get("template", "")
    tpl_fields    = {
        "headline": request.args.get("tpl_headline", ""),
        "subline":  request.args.get("tpl_subline", ""),
        "price":    request.args.get("tpl_price", ""),
        "cta":      request.args.get("tpl_cta", ""),
    }
    aspects = [a.strip() for a in aspects_str.split(",") if a.strip() in ASPECT_DESC]
    if not aspects:
        aspects = ["1:1"]

    job = UPLOAD_JOBS.pop(job_id, None)

    def gen():
        if not job:
            yield f"data: {json.dumps({'error': 'job not found'})}\n\n"; return

        files = job["files"]  # list of jersey image bytes
        before = set(OUTPUT_DIR.glob("*.jpg"))
        ts = int(time.time())

        total_imgs = len(aspects) * variations
        yield f"data: {json.dumps({'status': f'{len(files)} חולצות → {total_imgs} תמונות'})}\n\n"
        yield f"data: {json.dumps({'log': f'== {len(files)} חולצות, סגנון: {style}, רזולוציות: {aspects_str}, וריאציות: {variations} =='})}\n\n"
        if user_prompt:
            yield f"data: {json.dumps({'log': f'== הנחיה נוספת: {user_prompt[:80]} =='})}\n\n"

        step = 0
        for aspect in aspects:
            label, (w, h) = ASPECT_DESC[aspect]
            for v in range(1, variations + 1):
                step += 1
                vlabel = f" — וריאציה {v}/{variations}" if variations > 1 else ""
                yield f"data: {json.dumps({'log': f'[{step}/{total_imgs}] {aspect} ({w}×{h}){vlabel}'})}\n\n"
                yield f"data: {json.dumps({'log': '  🤖 Gemini מרכיב את כל החולצות בתמונה...'})}\n\n"
                try:
                    raw = generate_ad_image(files, style, user_prompt, aspect, gender, age, photo_style)
                    log_generation(aspect, style, len(files))
                    yield f"data: {json.dumps({'log': '  🎨 חיתוך לרזולוציה...'})}\n\n"
                    final = fit_to_aspect(raw, aspect)
                    if template_id and template_id in TEMPLATES:
                        yield f"data: {json.dumps({'log': f'  📝 תבנית: {template_id}'})}\n\n"
                        final = apply_template(template_id, final, aspect, tpl_fields)
                    if LOGO_PATH.exists():
                        yield f"data: {json.dumps({'log': '  🏷 מוסיף לוגו...'})}\n\n"
                        final = add_logo(final, size_pct=logo_size_pct,
                                         position=logo_pos, opacity=logo_opacity)
                    if upscale_factor > 1:
                        yield f"data: {json.dumps({'log': f'  🔍 שדרוג לרזולוציה ×{upscale_factor}...'})}\n\n"
                        final = upscale_image(final, factor=upscale_factor)
                    suffix = f"_v{v}" if variations > 1 else ""
                    fname = f"ad_{ts}_{aspect.replace(':', 'x')}_{style}{suffix}.jpg"
                    (OUTPUT_DIR / fname).write_bytes(final)
                    yield f"data: {json.dumps({'log': f'  ✅ {fname} ({len(final)//1024}KB)'})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'log': f'  ✗ שגיאה: {e}'})}\n\n"

        after = set(OUTPUT_DIR.glob("*.jpg"))
        new_images = sorted([f.name for f in (after - before)], reverse=True)
        yield f"data: {json.dumps({'done': True, 'images': new_images, 'status': f'✅ {len(new_images)} תמונות'})}\n\n"

    return Response(gen(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Entry ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = 5050
    print(f"\n{'='*45}")
    print(f"  Meta Ads Generator")
    print(f"  http://localhost:{port}")
    print(f"  Ctrl+C להפסקה")
    print(f"{'='*45}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
