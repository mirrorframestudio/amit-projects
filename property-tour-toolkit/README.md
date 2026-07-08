# 🏡 AI Property Tour Toolkit

Turn a set of listing photos into **one smooth, narrated property-tour video**
(Airbnb / real-estate style) — using **Higgsfield (Kling 3.0 pro)** for AI camera
motion and **ffmpeg** for assembly, voice-over sync, and music.

Built while producing the **Villa Cocos** tour (7-bedroom villa, garden → interior →
bedrooms → outdoor amenities → dusk hero, with Hebrew voice-over). See
[`examples/villa_cocos.md`](examples/villa_cocos.md) for the full worked build.

---

## What it produces
- Photos → seamless continuous **flythrough** clips (camera flies from one photo into the next)
- Chained into a full tour with **invisible joins** (frame-matched) + gentle dissolves between disconnected areas
- A **per-line voice-over** synced to each visual section
- **Background music ducked** under the voice-over
- Everything **16:9, 1080p**

## Prerequisites
- `ffmpeg` + `ffprobe`
- **Higgsfield CLI** — authenticate with `higgsfield auth login`
  - ⚠️ Always use the full `higgsfield ...` command, **not** `hf` (on many machines `hf` is HuggingFace's CLI).
- A Hebrew TTS source for the VO: Google Cloud **Speech Playground** (Gemini Flash TTS, voice *Charon*) or **ElevenLabs**.

---

## The core technique (why it looks smooth)

1. **Use Kling 3.0 `pro`, NOT Seedance.** Seedance (`seedance1_5`) morphs/warps between two
   different photos and looks bad. Kling (`kling3_0 --mode pro`) produces real physical camera motion.
2. **Bridge clips.** Each clip: `--start-image A --end-image B`. The model interpolates a
   continuous camera move A→B.
3. **Chain on rendered last frames.** Feed each bridge the *previous bridge's actual last frame*
   (`ffmpeg -sseof -0.05 -i prev.mp4 -vframes 1 last.png`) as its start image. Then a plain concat
   of the bridges has **invisible seams** (last frame of one == first frame of the next).
4. **Consistent-direction ordering.** Order photos so each is "ahead" of the previous — a forward
   walk, or a steady orbit always turning the same way. Jumping between opposite-facing shots
   produces a jarring "reverse" artifact.
5. **Big moves need time.** Large camera moves (pull-backs, stair climbs) look janky at 5s — render
   them at **10s**. If the visual then outpaces the narration, **speed the smooth 10s clip 2×** in
   ffmpeg (`setpts=0.5*PTS`) rather than regenerating a janky fast one.
6. **16:9 everywhere.** Pass `--aspect_ratio 16:9 --sound off`; pre-crop every source photo to 16:9
   (portrait shots need a smart crop).

## Cost & quirks (Higgsfield starter plan)
| model | 5s | 10s |
|---|---|---|
| `kling3_0 --mode pro` | 12.5 cr | 25 cr |
| `kling3_0` (std) | 10 cr | — |
| `seedance1_5` (4s) | 4.8 cr | — |

- **2 concurrent jobs max** → launch sequentially / in small waves (`rate_limit_reached` otherwise).
- `higgsfield generate create ... --json` returns a **JSON array** `["<id>"]`, not an object.
- Output is a CDN URL — download with `curl`. Kling pro outputs 1080p 16:9. Each job ≈ 3–4 min.
- Convert AVIF inputs: `ffmpeg -i x.avif x.jpg`.

---

## Workflow (scripts/)

```
scripts/lib.sh                 # shared: gen(), waitdl(), clean_vo(), last_frame()
scripts/01_convert_avif.sh     # AVIF -> JPG
scripts/02_crop_16x9.sh        # crop a photo to 1280x720 (16:9)
scripts/03_bridge.sh           # one Kling start->end bridge
scripts/04_chain.sh            # chain a list of photos into one seamless segment
scripts/05_assemble_master.sh  # concat segments (dissolves + seamless joins)
scripts/06_place_vo.sh         # place per-line VO clips at timestamps
scripts/07_add_music.sh        # duck music under the VO and mux
```

Typical run:
```bash
# 1. prep photos
./scripts/01_convert_avif.sh ~/Downloads/*.avif ./photos
./scripts/02_crop_16x9.sh ./photos/*.jpg ./crop

# 2. build a segment (a continuous flythrough over an ordered list of photos)
./scripts/04_chain.sh garden ./crop/g1.jpg ./crop/g2.jpg ./crop/g3.jpg ./crop/g4.jpg ./crop/g5.jpg
#   -> out/garden.mp4   (chained Kling pro bridges, seamless)

# ...repeat per area (interior, bedrooms, outdoor...) ...

# 3. assemble the master (edit the offsets/order inside the script for your segments)
./scripts/05_assemble_master.sh

# 4. voice-over: generate ONE clip per visual section (see VO note), drop them in ./vo/vo1.wav..voN.wav
./scripts/06_place_vo.sh master.mp4 ./vo   # edit the target timestamps inside

# 5. music
./scripts/07_add_music.sh master_vo.mp4 music.mp3
```

## Voice-over sync — the key trick
A single continuous TTS read **drifts** out of sync with the visuals. Instead:
- Write the script as **one short line per visual section**.
- Generate **each line as its own clip** in the TTS playground.
- **Place each line at its section's start time** (`adelay`); music fills the gaps.

This guarantees each sentence lands on the visuals it describes. If one section still feels off,
regenerate/replace just that one line. Also: if the *video* section is too long and the narration
starts describing the next room while the current one is still on screen, **speed that video clip up**
(see technique #5) — don't stretch the audio.

## Quality passes on the VO
`clean_vo()` in `lib.sh` applies: high-pass 90 Hz (kill rumble) → gentle compression → `loudnorm`
to −16 LUFS (consistent level across lines) → stereo/48k. Music is **side-chain ducked** under the
voice so the VO is always clear and the music breathes in the gaps.

---

## Short cut vs Long cut (two videos, one set of clips)
A property usually needs both a punchy teaser and a full showcase. Produce the clips **once**, cut twice.

- **Short (~90s):** the chained **flythrough** — fast, continuous, energetic. Steps 03–07 as-is.
- **Long (~3min):** don't just string transitions — the camera must **dwell** on each room.
  Add `08_dwell.sh` clips: a slow push-in / gentle drift that **lingers** on each space (8–10s each).
  Structure the long cut as *enter (flythrough) → dwell on the room → move on → dwell …*.
  The flythrough bridges become connective tissue; the dwell clips carry the detail.
  VO for the long cut is more descriptive per room (more time on screen = more to say).

Dwell clips are **single-image and independent** — no frame-matched chaining — so they're the
easiest part to batch in parallel.

## Parallel / batch production (10+ villas)
The plan's concurrent-job cap is the throttle: **Ultra = 8, Plus = 6, Starter = 2**. Work in waves:

1. **Prep everything first** — convert + crop all photos for all villas.
2. **Fan out generation** — launch clips up to the cap, poll, download. `08_dwell.sh` already throttles
   with `MAXPAR`. Chained segments (`04_chain.sh`) are sequential *within* a segment, but different
   segments and different villas run concurrently — so keep several in flight.
3. **Edit in series** while the next batch generates in the background — your editing time is the real
   bottleneck, not the render wait.
4. Reuse a **fixed script + assembly template** per villa (fill-in-the-blanks) so villas 3–10 fly.

Rough throughput once dialed in: **~2.5–4 active hours per villa** (both cuts); a 10-villa batch ≈
**7–9 working days**, generation overlapping edits.

## Reality check on credits (read before picking a plan)
The **video** model (Kling 3.0) **costs credits** — it is *not* in the "unlimited & free generations"
list, which covers **image** models (Nano Banana, Flux, Seedream, Kling *Image*, GPT Image, Soul).
So size the plan by **credits**, not by the unlimited badge:

- One ~90s villa flythrough ≈ **~230 credits**. A villa's long+short (clips reused) ≈ **~350–450 credits**.
- 10 villas ≈ **~4,000 credits** → **Ultra** (3,000/mo, bump the slider to 6,000) fits; **Plus** (1,200) does not.
- Save credits: prefer `kling3_0` std over `--mode pro` on simple clips; avoid re-rolls (plan motion up front);
  use Ken Burns (ffmpeg, 0 credits) for static hero/closing shots.

See [`PRICING.md`](PRICING.md) for the client-facing pricing model.
