"""
Quick test - send one jersey image URL to Gemini and save result locally.
Usage: python test_gemini.py <image_url>
"""
import sys
import os
import requests
from pathlib import Path
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

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

load_env(ROOT / "model-images" / ".env")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

PROMPT = """You are given a product image of a sports jersey.
Generate a high-quality studio photo (700x700 pixels) of a FICTIONAL, NON-RECOGNIZABLE male model wearing EXACTLY this jersey.
- Wear THIS EXACT jersey - preserve all logos, numbers, colors, and patterns precisely
- Plain blue jeans (waist up visible)
- Pure white background (#FFFFFF), no shadows
- NOT a real/recognizable person - generic fictional appearance
- Natural standing pose
- Professional product photography style
- No watermarks"""

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_gemini.py <image_url>")
        sys.exit(1)

    image_url = sys.argv[1]
    print(f"מוריד תמונה: {image_url}")

    r = requests.get(image_url, timeout=15)
    r.raise_for_status()
    jersey_bytes = r.content
    print(f"תמונה הורדה ({len(jersey_bytes)//1024}KB)")

    print("שולח לGemini...")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[
            types.Part.from_bytes(data=jersey_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=PROMPT),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        )
    )

    import base64
    output_dir = Path(__file__).resolve().parent / "output"
    output_dir.mkdir(exist_ok=True)

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            img_bytes = base64.b64decode(part.inline_data.data)
            out_path = output_dir / f"test_{datetime.now().strftime('%H%M%S')}.jpg"
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"\nנשמר: {out_path}")
            os.startfile(out_path)  # פותח את התמונה אוטומטית
            return

    print("Gemini לא החזיר תמונה")

if __name__ == "__main__":
    main()
