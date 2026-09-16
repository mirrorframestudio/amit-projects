#!/usr/bin/env python3
"""Publish a Meluvo blog article to Shopify via the Admin GraphQL API.

Usage:
    python publish_article.py blog/07-shift-workers-sleep.json [--dry-run] [--draft]

The JSON sits next to the HTML body (same basename, .html) and holds:
    title, handle, summary (HTML), description (meta), tags (list)

Auth: SHOPIFY_ADMIN_TOKEN env var (custom-app token with write_content + read_content).
Optional: SHOPIFY_SHOP (default ymy9ur-n2.myshopify.com), SHOPIFY_API_VERSION (default 2025-07).

Exit codes: 0 published, 2 no token (caller should fall back to a PR), 1 any other failure.
Stdlib only — runs anywhere.
"""
import json
import os
import sys
import urllib.request
import urllib.error

SHOP = os.environ.get("SHOPIFY_SHOP", "ymy9ur-n2.myshopify.com")
API_VERSION = os.environ.get("SHOPIFY_API_VERSION", "2025-07")
BLOG_ID = "gid://shopify/Blog/94247125130"  # the "news" blog on mymeluvo.com
AUTHOR = "Meluvo"

CREATE = """
mutation CreateArticle($article: ArticleCreateInput!) {
  articleCreate(article: $article) {
    article { id title handle isPublished }
    userErrors { field message code }
  }
}"""

SET_META = """
mutation SetMeta($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id key }
    userErrors { field message code }
  }
}"""

EXISTS = """
query ($q: String!) { articles(first: 1, query: $q) { edges { node { id handle } } } }"""


def gql(token, query, variables):
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/{API_VERSION}/graphql.json",
        data=json.dumps({"query": query, "variables": variables}).encode(),
        headers={"Content-Type": "application/json", "X-Shopify-Access-Token": token},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} from Shopify: {e.read().decode()[:500]}")
    if body.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(body['errors'], ensure_ascii=False)}")
    return body["data"]


def load(meta_path):
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    html_path = os.path.splitext(meta_path)[0] + ".html"
    with open(html_path, encoding="utf-8") as f:
        body = f.read().strip()

    problems = []
    for k in ("title", "handle", "summary", "description", "tags"):
        if not meta.get(k):
            problems.append(f"missing {k}")
    if len(meta.get("title", "")) > 70:
        problems.append("title > 70 chars")
    if not 100 <= len(meta.get("description", "")) <= 160:
        problems.append(f"description is {len(meta.get('description', ''))} chars (want 100-160)")
    if not all(c.islower() or c.isdigit() or c == "-" for c in meta.get("handle", "")):
        problems.append("handle must be lowercase english kebab-case")
    if "<h1" in body.lower():
        problems.append("body must not contain <h1> (title is the H1)")
    if "/products/" not in body:
        problems.append("body has no internal link to a product")
    words = len(body.split())
    if words < 450:
        problems.append(f"body only ~{words} words")
    if any(s in body for s in ("₪", "מחיר")):
        problems.append("body mentions price — not allowed (see BRIEF.md)")
    if problems:
        sys.exit("Refusing to publish:\n  - " + "\n  - ".join(problems))
    return meta, body


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 1:
        sys.exit(__doc__)
    meta, body = load(args[0])

    article = {
        "blogId": BLOG_ID,
        "title": meta["title"],
        "handle": meta["handle"],
        "author": {"name": AUTHOR},
        "isPublished": "--draft" not in flags,
        "tags": meta["tags"],
        "summary": meta["summary"],
        "body": body,
    }
    if "--dry-run" in flags:
        print("DRY RUN — would create:", json.dumps({k: v for k, v in article.items() if k != "body"}, ensure_ascii=False, indent=2))
        print(f"body: {len(body.split())} words")
        return

    token = os.environ.get("SHOPIFY_ADMIN_TOKEN")
    if not token:
        print("SHOPIFY_ADMIN_TOKEN not set — cannot publish. Fall back to committing the files and opening a PR.", file=sys.stderr)
        sys.exit(2)

    found = gql(token, EXISTS, {"q": f"handle:{meta['handle']}"})["articles"]["edges"]
    if found:
        sys.exit(f"An article with handle '{meta['handle']}' already exists ({found[0]['node']['id']}). Pick another handle.")

    res = gql(token, CREATE, {"article": article})["articleCreate"]
    if res["userErrors"]:
        sys.exit(f"articleCreate failed: {json.dumps(res['userErrors'], ensure_ascii=False)}")
    art = res["article"]

    meta_res = gql(token, SET_META, {"metafields": [{
        "ownerId": art["id"], "namespace": "global", "key": "description_tag",
        "type": "single_line_text_field", "value": meta["description"],
    }]})["metafieldsSet"]
    if meta_res["userErrors"]:
        print(f"warning: description_tag not set: {meta_res['userErrors']}", file=sys.stderr)

    print(f"published: https://mymeluvo.com/blogs/news/{art['handle']}  ({art['id']}, isPublished={art['isPublished']})")


if __name__ == "__main__":
    main()
