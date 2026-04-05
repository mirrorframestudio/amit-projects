"""One-off: regenerate Barcelona 25/26 kids image using the correct reference."""
import os, sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def load_env(path):
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
    except FileNotFoundError:
        pass

load_env(ROOT / "fb-ads-analyzer" / ".env")
load_env(ROOT / "adcampaigner" / ".env")
load_env(ROOT / "model-images" / ".env")

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

REF_IMAGE = Path(__file__).resolve().parent / "output" / "barca_kids_ref.jpg"
OUT_PATH  = Path(__file__).resolve().parent / "output" / "40986_ברצלונה בית חליפת ילדים עונת 25_26.jpg"

import random
POSES_KIDS = [
    "big happy smile, both arms slightly raised with excitement, joyful energy",
    "thumbs up with both hands, big grin, playful stance",
    "one hand pointing at the team logo on the chest, proud happy smile",
    "arms at sides, bright happy smile, looking directly at camera",
    "playful pose with one leg slightly forward, hands on hips, big smile",
]

def get_kids_prompt():
    pose = random.choice(POSES_KIDS)
    return f"""Create a photorealistic e-commerce product photo using the uploaded football kit image as reference.

Show a completely fictional, generic, non-recognizable child (age 7-10, either boy or girl, friendly face) wearing this exact football kit (shirt + shorts matching the kit in the image). The child must NOT resemble any real person. Full body shot from head to knees, the child's full face and head MUST be clearly visible and fully in frame — do NOT crop the head or face.

Pose: the child is {pose}.

Kit rules — STRICT:
- Copy the exact color scheme and pattern from the input image for BOTH the shirt and shorts
- The shirt has thick blue and red vertical stripes — replicate this EXACTLY
- Include ONLY the logos and graphics that are clearly visible in the input image — do NOT add, invent, or guess any sponsor logos, badges, or text not in the input
- If a logo is unclear, leave that area plain
- Same shirt and shorts style as the input

Professional studio setting: pure white background, soft even lighting, sharp focus on the child and kit.

Output: square image optimized for 700x700 product display."""

def main():
    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY")
        sys.exit(1)

    ref_bytes = REF_IMAGE.read_bytes()
    print(f"✓ Loaded reference: {REF_IMAGE.name} ({len(ref_bytes)//1024}KB)")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_KEY)
    prompt = get_kids_prompt()
    print(f"🤖 Sending to Gemini (kids model, Barcelona 25/26)...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            types.Part.from_bytes(data=ref_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        )
    )

    img_bytes = None
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            img_bytes = data if isinstance(data, bytes) else data.encode('latin-1')
            break

    if not img_bytes:
        raise ValueError("Gemini returned no image")

    OUT_PATH.write_bytes(img_bytes)
    print(f"✅ Saved: {OUT_PATH.name} ({len(img_bytes)//1024}KB)")
    print(f"\nReview: {OUT_PATH}")
    print("If good, run: python generate_model_images.py --upload --ids 40986 --force")

if __name__ == "__main__":
    main()
