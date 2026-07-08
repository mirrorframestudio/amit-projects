# Worked example — Villa Cocos

The full tour that this toolkit was built from. Villa Cocos: 7-bedroom hosting-club villa,
up to 25 guests, heated fenced pool, jacuzzi, outdoor kitchen + BBQ, games yard.

## Segments (each a chained Kling-pro flythrough)
| segment | photos | motion | notes |
|---|---|---|---|
| `garden` | 5 | orbit **left** around the pool | outside → into the garden, consistent-direction orbit |
| `interior` | dining→kitchen→living | dining tour → **rotate to kitchen** → **10s pull-back** to wide → zoom into living | the pull-back was rendered at 10s (5s looked janky), later sped 2× |
| `living_to_stairs` | 1 | single-image push toward the staircase | ends at the base of the stairs (chain point) |
| `bedrooms` | 6 | up the stairs → master → en-suite bath → 4 more bedrooms | stair-climb rendered 10s, later sped 2×; bathroom placed right after the master (its doorway reveals it) |
| `outdoor` | 4 | yard → ping-pong/cabana → outdoor kitchen/bar → jacuzzi | back-yard amenities finale |
| `dusk` | 1 | slow push-in on the twilight hero shot | closing "money shot", held 3.5s |

## Assembly
- Frame-matched seam: `living_to_stairs` → `bedrooms` (bedrooms chained from the stairs last frame) → plain concat.
- 1s dissolves between disconnected areas: garden↔interior, interior↔living_to_stairs, bedrooms↔outdoor, outdoor↔dusk.
- Master ≈ 103 s, 1920×1080.

## Pacing fixes we learned
- Narration started describing bedrooms while still climbing the stairs → **sped the 10s climb to 5s** (`setpts=0.5*PTS`).
- Same for the kitchen→living pull-back (10s → 5s) — the living VO was landing while the kitchen was still receding.
- **Finalize the visual first, then narrate to it.** Chasing VO-vs-video back and forth wastes time.

## Voice-over (Hebrew)
- Google Cloud **Speech Playground** → *Generate speech with Gemini Flash TTS*, voice **Charon**, language **Hebrew (Israel)**.
- Style instruction: `Read aloud with warm, upbeat energy and genuine excitement, like an inviting lifestyle promo. Friendly and enthusiastic, lively pacing, but still smooth and premium. Natural spoken Hebrew.`
- **One line per section** (10 clips), placed at each section's start time (`06_place_vo.sh`).
- Script (per section): intro+pool · dining · kitchen · living · stairs · master+bath · more bedrooms · outdoor amenities · jacuzzi · closing ("וילה קוקוס. כאן החופשה המושלמת מתחילה.").

## VO placement (final, 102.9 s master)
```
vo1  1.0   garden/pool          vo6  56.5  master + bathroom
vo2  19.5  dining               vo7  66.0  more bedrooms
vo3  27.5  kitchen              vo8  81.0  outdoor amenities
vo4  42.0  living               vo9  91.5  jacuzzi
vo5  51.5  stairs               vo10 98.0  dusk / closing
```

## Gotchas hit
- `hf` on the machine was HuggingFace's CLI, not Higgsfield → always `higgsfield ...`.
- `generate create --json` returns `["id"]` (array) — parse `d[0]`.
- Seedance (first attempts) morphed/warped → switched everything to **Kling 3.0 pro**.
- Starter plan: 2 concurrent jobs; long chains exceed a 10-min shell timeout → run ~2 bridges per call.
