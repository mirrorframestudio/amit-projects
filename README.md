# מפת הפרויקטים — ads-dashboard

## OneZoneJersey (חנות חולצות כדורגל)

| תיקייה | מה זה | סטטוס |
|--------|--------|--------|
| `weekly-pnl/` | דוח P&L שבועי — Shopify + Meta Ads | ✅ פעיל |
| `invoice-extractor/` | שליפת חשבוניות מGmail → שליחה למייל | ✅ פעיל |
| `product-descriptions/` | יצירת תיאורי מוצר בעברית דרך Claude AI | ✅ פעיל |
| `model-images/` | יצירת תמונות דוגמן לחולצות דרך Gemini AI | 🔨 בבנייה |
| `onezone-remarketing/` | רימרקטינג / אימייל מרקטינג | ⏸ מושהה |

### הרצה מהירה
```bash
# P&L שבועי
cd weekly-pnl && python -m src.run_weekly_pnl --last-completed-week

# תיאורי מוצר (Claude)
cd product-descriptions && python generate_descriptions.py --limit 5 --test

# תמונות דוגמן (Gemini)
cd model-images && python generate_model_images.py --preview --limit 5
```

---

## Mirror Frame Studio (עסק נפרד)
| תיקייה | מה זה |
|--------|--------|
| `mirror-frame-studio/` | אתר + כלי תמחור + חוזה לקוחות |

---

## כלים משותפים — אל תזיז!
| תיקייה | למה חשוב |
|--------|-----------|
| `fb-ads-analyzer/` | מכיל `.env` עם WooCommerce + Anthropic keys — נדרש לכל הסקריפטים |
| `adcampaigner/` | מכיל `.env` עם Anthropic key |

---

## ארכיון (ישן / לא בשימוש)
| תיקייה | מה זה |
|--------|--------|
| `monday-pnl/` | גרסאות Excel ישנות של P&L — הוחלף ע"י `weekly-pnl` |
| `meluvo-bundle/` `meluvo-theme/` | לא קשור לעסקים הנוכחיים |
| `backend/` `frontend/` `database/` | דאשבורד ישן (Docker) — לא בשימוש |
| `n8n/` | אוטומציה ישנה — לא בשימוש |

---

# Ads Dashboard (original)

A simple ads campaign dashboard built with Next.js, FastAPI, and PostgreSQL.

## Project Structure

```
ads-dashboard/
├── docker-compose.yml        # Runs all services together
├── .env.example              # Template — copy to .env and fill in secrets
├── database/
│   └── init.sql              # Creates tables and seeds sample data
├── backend/                  # FastAPI (Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # App entry point, CORS config
│       ├── database.py       # DB connection (SQLAlchemy)
│       ├── models.py         # Database table definitions
│       ├── schemas.py        # Request/response shapes (Pydantic)
│       ├── routers/
│       │   ├── campaigns.py  # Campaign API endpoints
│       │   ├── debug.py      # Dev-only: inspect DB tables
│       │   └── meta.py       # Meta Ads status check
│       └── services/
│           └── meta.py       # Meta Ads connector (skeleton)
└── frontend/                 # Next.js (TypeScript)
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx    # Page shell / header
        │   └── page.tsx      # Home page
        └── components/
            └── CampaignTable.tsx  # Fetches and displays campaigns
```

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run everything with one command

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs (auto-generated): http://localhost:8000/docs

### Stop everything

```bash
docker compose down
```

To also delete the database volume:

```bash
docker compose down -v
```

---

## Environment Variables

The app uses a `.env` file to store secrets like API credentials.
This file is **never committed to Git** — only the safe template (`.env.example`) is.

### Step 1 — Create your `.env` file

```bash
# Mac / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open the new `.env` file in any text editor and replace the placeholder values.

---

### Step 2 — Fill in the Meta Ads credentials

| Variable | What it is |
|---|---|
| `META_ACCESS_TOKEN` | A secret token that proves your app has permission to read your ad data |
| `META_AD_ACCOUNT_ID` | The numeric ID of your Meta Ads account |

#### How to get `META_ACCESS_TOKEN`

1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in
2. Click **My Apps → Create App**, choose type **Business**
3. Inside your app, click **Add Product** and add **Marketing API**
4. Go to **Tools → Graph API Explorer**
5. Select your app from the top-right dropdown
6. Click **Generate Access Token** and grant the permissions it asks for
7. Copy the long string of characters — that is your token

#### How to get `META_AD_ACCOUNT_ID`

1. Go to [business.facebook.com](https://business.facebook.com/)
2. Click the **Settings** (gear) icon → **Ad Accounts**
3. Your account ID is shown there — it starts with `act_` followed by numbers
4. **Only copy the numbers** — leave out the `act_` prefix
   - Example: if you see `act_1234567890`, put `1234567890` in your `.env`

Your `.env` file should look like this when filled in:

```
META_ACCESS_TOKEN=EAABsbCS...long string...
META_AD_ACCOUNT_ID=1234567890
```

---

### Step 3 — Verify it worked

Restart Docker, then open this URL in your browser:

```
http://localhost:8000/meta/status
```

**Credentials missing** (what you see before filling in `.env`):
```json
{
  "configured": false,
  "variables": {
    "META_ACCESS_TOKEN":  "missing",
    "META_AD_ACCOUNT_ID": "missing"
  }
}
```

**Credentials set correctly:**
```json
{
  "configured": true,
  "variables": {
    "META_ACCESS_TOKEN":  "set",
    "META_AD_ACCOUNT_ID": "set"
  }
}
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Health check message |
| GET | `/health` | Health status |
| GET | `/campaigns/` | List all campaigns |
| GET | `/campaigns/{id}` | Get one campaign |
| POST | `/campaigns/` | Create a campaign |
| GET | `/meta/status` | Check Meta credentials are configured |
| GET | `/debug/tables` | List all DB tables and row counts |
| GET | `/debug/tables/{name}/sample` | Show up to 5 rows from a table |
| GET | `/debug/relationships` | Verify campaign → adset → ad links |

> **Note:** `/debug/*` routes are for local development only. Remove them before going to production.

---

## Running without Docker (for development)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
DATABASE_URL=postgresql://ads_user:ads_password@localhost:5432/ads_db \
  uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> You still need PostgreSQL running. The easiest way is to start only the DB container:
> ```bash
> docker compose up db
> ```
