# Shikma Ella Sun — Villa Tour (4th Ella Sun villa)

Eilat · pool + jacuzzi + roof terrace · sleeps 6 · family-oriented. Booking 9.2/30.

`photos/` — 37 real listing photos (max1920), pulled from the Booking gallery.
Filenames `pNN_<bookingId>.jpg`.

## Pipeline
Real photo per shot → **Kling 3.0 pro** (5s, 1080p) → bridge-chain in `build_reel.py`
→ optional **Bytedance video upscale to 4K**. Chosen over Seedance 2.5 (≈2.2× cost,
720p cap). Split into parts; each part gets its own video + VO script.

- **Part 1 — Exterior** (pool, loungers, lounge, outdoor dining, BBQ, jacuzzi, roof) ← in progress, see `part1_exterior.md`
- **Part 2 — Social interior** (living, dining, kitchen)
- **Part 3 — Bedrooms + bath** (bathrooms empty — no model)

## Rules
- Real photos only — never invent rooms/features.
- Include family model shots (family in/around pool, at the outdoor table, dad at BBQ, couple in jacuzzi). **No model in the shower.**
- Every part ships with a Hebrew VO script, written to sit well at **1.15× playback** (Amit speeds the final video), listing facts only.
