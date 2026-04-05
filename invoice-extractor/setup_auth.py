#!/usr/bin/env python3
"""
One-time authentication setup for both Gmail accounts.
Run this once to generate token_amit.json and token_meluvo.json.
"""
from gmail_client import GmailClient

accounts = [
    ('onezonejersey@gmail.com', 'token_onezone.json'),
    ('mymeluvo@gmail.com',      'token_meluvo.json'),
]

for email, token_file in accounts:
    import os
    if os.path.exists(token_file):
        print(f"✅  {email} — {token_file} כבר קיים, מדלג")
        continue
    print(f"\n🔐  מאמת: {email}")
    print(f"   יפתח דפדפן — התחבר עם {email}")
    input("   לחץ Enter להמשך...")
    GmailClient(token_file=token_file)
    print(f"✅  נשמר: {token_file}")

print("\n✅  הגדרת חשבונות הושלמה!")
