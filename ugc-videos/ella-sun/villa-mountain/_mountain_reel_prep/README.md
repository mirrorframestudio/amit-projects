# הבית על ההר — 9:16 Reel (VO version)

Working set for the vertical reel. Current cut: **`../final/mountain_REEL_9x16_VO.mp4`** — 42.3s, 1080×1920, visual + Hebrew VO, **no music** (Amit adds music + subtitles in his own editor).

## The rule that matters

Everything in this reel comes from **real photos of the property**. Do not let the AI invent
architecture. Earlier attempts to outpaint a 3:2 photo into 9:16 fabricated a pergola that
doesn't exist, raised the real one, invented floor tiling, and produced a sauna "entrance"
that isn't there — all rejected by the client.

**What works instead:** Amit expands the photo to 9:16 himself in Photoshop (Generative
Expand), approves it, and sends it. Then Higgsfield/Kling only *animates* it with the camera
**locked off** — motion comes from water, leaves, light, and people, never from a camera move
that would force the model to invent beyond the frame. The one exception is the living-room
shot, which uses a slow forward drone push (moving *into* the scene reveals what's already
there, so it's safe).

Two recurring gotchas:
- **Flags**: Kling redraws waving flags and turned the Israeli flag Greek. Always state
  explicitly in the prompt that it is the Israeli flag and must not change.
- **Watermarks**: the upscaler stamps an "Ai" mark top-left. Removed via ffmpeg `delogo`
  before animating (see `source_images/pool_9x16_nowatermark.jpg`).

## Shot order (and which VO line sits on it)

| # | shot | VO line |
|---|------|---------|
| 1 | family_slow | L1 — "הבית על ההר… הנכס הדרומי ביותר" |
| 2 | panorama_v2 | L1 — "…עם נוף עוצר נשימה" |
| 3 | pool_slow | L2 — "…עם בריכה מגודרת ובטוחה" |
| 4 | jacuzzi_couple | L3 — "ג'קוזי מפנק" |
| 5 | sauna_couple_new | L3 — "…וסאונה פרטית" |
| 6 | outkitchen | L4 — "ומטבח חוץ עם מנגל מקצועי" |
| 7 | living_drone | L5 — "ובפנים בית מאובזר…" |
| 8 | bedroom | L5 (cont.) |
| 9 | lounge_family | L6 — "ובערב…" |
| 10 | couple_terrace_slow | L6 / L7 |
| 11 | endcard_49 | L7 tail + L8 — "הבית על ההר. אלה סאן" |

`build/build_reel.sh` holds the exact per-shot durations and VO offsets. **The shot lengths are
tuned so each key word lands on its own shot** — if you reorder or swap a shot, re-check the
sync before shipping, because it drifts fast (that was the last bug fixed).

## Still on old material

`panorama_v2`, `outkitchen`, `bedroom` are still from the earlier tour footage. To upgrade them,
expand those areas to 9:16 in Photoshop and animate the same way as the rest.

## Rebuild

```bash
bash build/build_reel.sh     # paths inside point at ~/Downloads — adjust for this machine
```
