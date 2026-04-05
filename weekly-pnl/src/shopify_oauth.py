"""
Shopify OAuth flow for Dev Dashboard apps.

Usage:
    python -m src.shopify_oauth

This will:
1. Open your browser to authorize the app
2. Listen on localhost:8000 for the callback
3. Exchange the code for an access token
4. Save the token to shopify_token.json

You need these in your .env file:
    SHOPIFY_SHOP_DOMAIN=mymeluvo.myshopify.com
    SHOPIFY_CLIENT_ID=your_client_id_from_dev_dashboard
    SHOPIFY_CLIENT_SECRET=your_client_secret_from_dev_dashboard
"""
import http.server
import json
import os
import sys
import threading
import urllib.parse
import webbrowser

import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "shopify_token.json")

SHOP_DOMAIN = os.environ.get("SHOPIFY_SHOP_DOMAIN", "")
CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET", "")
REDIRECT_URI = "http://localhost:8000/callback"
SCOPES = "read_orders,read_products,read_inventory"


class OAuthCallbackHandler(http.server.BaseHTTPRequestHandler):
    """Handle the OAuth callback from Shopify."""

    access_token = None
    error = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/callback":
            code = params.get("code", [None])[0]
            shop = params.get("shop", [None])[0]

            if not code:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Error: no code received")
                OAuthCallbackHandler.error = "No code in callback"
                return

            # Exchange code for access token
            token_url = f"https://{shop}/admin/oauth/access_token"
            payload = {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
            }

            try:
                resp = requests.post(token_url, json=payload, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                access_token = data.get("access_token", "")

                if access_token:
                    OAuthCallbackHandler.access_token = access_token

                    # Save to file
                    token_data = {
                        "access_token": access_token,
                        "shop": shop,
                        "scope": data.get("scope", SCOPES),
                    }
                    with open(TOKEN_FILE, "w") as f:
                        json.dump(token_data, f, indent=2)

                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(
                        b"<html><body style='font-family:Arial;text-align:center;padding:50px'>"
                        b"<h1 style='color:green'>SUCCESS!</h1>"
                        b"<p>Access token saved. You can close this window.</p>"
                        b"</body></html>"
                    )
                    print(f"\nAccess token saved to {TOKEN_FILE}")
                    print(f"Token starts with: {access_token[:12]}...")
                else:
                    raise ValueError(f"No access_token in response: {data}")

            except Exception as e:
                OAuthCallbackHandler.error = str(e)
                self.send_response(500)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(
                    f"<html><body><h1>Error</h1><p>{e}</p></body></html>".encode()
                )
                print(f"\nERROR: {e}")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress default logging


def load_saved_token():
    """Load a previously saved token from shopify_token.json."""
    if os.path.isfile(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            data = json.load(f)
        return data.get("access_token")
    return None


def test_token(token: str, shop: str) -> bool:
    """Quick test: fetch shop info to verify the token works."""
    url = f"https://{shop}/admin/api/2024-01/shop.json"
    headers = {"X-Shopify-Access-Token": token}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            shop_info = resp.json().get("shop", {})
            print(f"Token is valid! Shop: {shop_info.get('name', 'unknown')}")
            return True
        else:
            print(f"Token test failed: HTTP {resp.status_code}")
            return False
    except Exception as e:
        print(f"Token test failed: {e}")
        return False


def run_oauth():
    """Run the full OAuth flow."""
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    # Validate env vars
    missing = []
    if not SHOP_DOMAIN:
        missing.append("SHOPIFY_SHOP_DOMAIN")
    if not CLIENT_ID:
        missing.append("SHOPIFY_CLIENT_ID")
    if not CLIENT_SECRET:
        missing.append("SHOPIFY_CLIENT_SECRET")

    if missing:
        print("ERROR: Missing environment variables in .env file:")
        for m in missing:
            print(f"  - {m}")
        print(f"\nEdit the .env file and add them.")
        sys.exit(1)

    # Check if we already have a valid token
    existing = load_saved_token()
    if existing:
        print(f"Found existing token in {TOKEN_FILE}")
        if test_token(existing, SHOP_DOMAIN):
            print("Existing token is still valid! No need to re-authorize.")
            return
        print("Existing token is invalid, starting OAuth flow...\n")

    # Build authorization URL
    auth_url = (
        f"https://{SHOP_DOMAIN}/admin/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"scope={SCOPES}&"
        f"redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    )

    print("=" * 60)
    print("SHOPIFY OAUTH FLOW")
    print("=" * 60)
    print(f"Shop:     {SHOP_DOMAIN}")
    print(f"Scopes:   {SCOPES}")
    print(f"Callback: {REDIRECT_URI}")
    print("=" * 60)
    print("\nOpening browser for authorization...")
    print("If the browser doesn't open, go to this URL manually:\n")
    print(auth_url)
    print()

    # Start local server
    server = http.server.HTTPServer(("localhost", 8000), OAuthCallbackHandler)
    server_thread = threading.Thread(target=server.handle_request)
    server_thread.start()

    # Open browser
    webbrowser.open(auth_url)

    print("Waiting for callback...")
    server_thread.join(timeout=120)
    server.server_close()

    if OAuthCallbackHandler.access_token:
        print("\nDone! You can now run the P&L report:")
        print("  python -m src.run_weekly_pnl --last-completed-week")
    elif OAuthCallbackHandler.error:
        print(f"\nOAuth failed: {OAuthCallbackHandler.error}")
        sys.exit(1)
    else:
        print("\nTimeout — no callback received within 2 minutes.")
        sys.exit(1)


if __name__ == "__main__":
    run_oauth()
