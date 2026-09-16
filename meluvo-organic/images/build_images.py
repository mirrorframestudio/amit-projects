#!/usr/bin/env python3
"""Generate blog featured images for Meluvo via the Higgsfield CLI (nano_banana_2, 16:9).

    python build_images.py prompts.json [--only key1,key2] [--dry-run]

prompts.json: {"<key>": "<scene description, ONE line>", ...}
Output: ./<key>.jpg next to this script + manifest.json {key: {job_id, url, prompt}}.

Guards (from memory: the CLI silently drops flags after a blank line and mis-attaches refs):
prompts are forced to one line, and every job payload is read back and checked before waiting.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
HF = "higgsfield.cmd" if os.name == "nt" else "higgsfield"
MANIFEST = os.path.join(HERE, "manifest.json")

# One house style for every image so the blog index reads as one publication.
STYLE = ("Editorial photograph for a health and sleep magazine. Natural available light only, warm amber and "
         "deep blue night palette, shallow depth of field, 35mm lens, quiet and calm mood, real Israeli adults "
         "in their late 20s to 40s, candid and unposed, no text, no logos, no watermark, no brand names, "
         "no visible eyewear brand details.")


def run(args):
    p = subprocess.run([HF, *args, "--json"], capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        raise RuntimeError(f"higgsfield {' '.join(args[:2])} failed: {p.stderr.strip()[:400]}")
    return json.loads(p.stdout)


def find_urls(obj, out=None):
    out = [] if out is None else out
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("url", "image_url", "result_url") and isinstance(v, str) and v.startswith("http"):
                out.append(v)
            else:
                find_urls(v, out)
    elif isinstance(obj, list):
        for v in obj:
            find_urls(v, out)
    return out


def compress(path, width=1600, quality=85):
    """Higgsfield returns ~7MB PNG data under a .jpg name; make a real web JPEG."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    dry = "--dry-run" in sys.argv
    prompts = json.load(open(args[0], encoding="utf-8"))
    manifest = json.load(open(MANIFEST, encoding="utf-8")) if os.path.exists(MANIFEST) else {}

    jobs = {}
    for key, scene in prompts.items():
        if only and key not in only:
            continue
        if key in manifest and os.path.exists(os.path.join(HERE, key + ".jpg")):
            print(f"skip {key} (already built)")
            continue
        prompt = " ".join((scene.strip() + " " + STYLE).split())  # single line, no blank lines
        if dry:
            print(f"[dry] {key}: {prompt[:120]}...")
            continue
        created = run(["generate", "create", "nano_banana_2", "--prompt", prompt,
                       "--aspect_ratio", "16:9", "--resolution", "2k"])
        if isinstance(created, list):
            created = created[0] if created else {}
        if isinstance(created, str):
            created = {"id": created}
        job_id = created.get("id") or created.get("job_id") or (created.get("jobs") or [{}])[0].get("id")
        if not job_id:
            raise RuntimeError(f"no job id in create response: {json.dumps(created)[:300]}")
        # Read the payload back and assert the inputs really landed.
        got = run(["generate", "get", job_id])
        if isinstance(got, list):
            got = got[0]
        params = got.get("params") or got.get("input") or got
        sent_prompt = params.get("prompt", "")
        if len(sent_prompt) < len(prompt) - 5 or params.get("aspect_ratio") not in ("16:9", None):
            raise RuntimeError(f"{key}: payload mismatch — prompt {len(sent_prompt)}/{len(prompt)} chars, "
                               f"aspect_ratio={params.get('aspect_ratio')}")
        jobs[key] = (job_id, prompt)
        print(f"created {key} -> {job_id}")

    for key, (job_id, prompt) in jobs.items():
        for _ in range(60):
            got = run(["generate", "get", job_id])
            if isinstance(got, list):
                got = got[0]
            status = (got.get("status") or "").lower()
            urls = [u for u in find_urls(got) if "result" in str(got.get("result_url") or "") or True]
            urls = [got["result_url"]] if got.get("result_url") else []
            if status in ("completed", "succeeded", "done", "success") or (urls and status not in ("queued", "in_progress", "processing", "pending")):
                break
            if status in ("failed", "error", "cancelled"):
                raise RuntimeError(f"{key}: job {job_id} {status}")
            time.sleep(5)
        else:
            raise RuntimeError(f"{key}: timed out waiting for {job_id}")
        url = urls[0]
        dest = os.path.join(HERE, key + ".jpg")
        urllib.request.urlretrieve(url, dest)
        compress(dest)
        manifest[key] = {"job_id": job_id, "url": url, "prompt": prompt}
        json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"saved {dest} ({os.path.getsize(dest)//1024} KB)")


if __name__ == "__main__":
    main()
