#!/usr/bin/env python3
"""
Invoice Gmail Extractor — Multi-Account
----------------------------------------
Pulls invoices from multiple Gmail accounts,
combines everything, and sends one report to a single recipient.
"""

import os
import sys
import re
import hashlib
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()


def _check_env():
    errors = []
    if not os.path.exists('credentials.json'):
        errors.append("❌  חסר credentials.json")
    if not os.environ.get('ANTHROPIC_API_KEY'):
        errors.append("❌  חסר ANTHROPIC_API_KEY ב-.env")
    if errors:
        print("\n".join(errors))
        sys.exit(1)


def _safe_filename(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', '_', name)


def _compute_last_month():
    today = date.today()
    first_this = today.replace(day=1)
    if first_this.month == 1:
        first_last = date(first_this.year - 1, 12, 1)
    else:
        first_last = date(first_this.year, first_this.month - 1, 1)
    return first_last.strftime('%Y/%m/%d'), first_this.strftime('%Y/%m/%d')


def pull_account(account: dict, date_filter: str, date_before: str,
                 skip_keywords: list, out_dir: str, seen_hashes: set, seen_invoice_numbers: set) -> list:
    """Pull invoices from one Gmail account into out_dir. Returns list of invoices."""
    from gmail_client import GmailClient
    from invoice_extractor import InvoiceExtractor

    label      = account['label']
    token_file = account['token_file']

    print(f"\n  📧 מושך מ: {label}")
    print(f"  {'─'*40}")

    client = GmailClient(token_file=token_file)

    # Build query
    query = (
        'has:attachment ('
        'invoice OR חשבונית OR receipt OR קבלה OR חשבון OR '
        '"tax invoice" OR filename:pdf'
        ')'
    )
    if date_filter:
        query += f' after:{date_filter}'
    if date_before:
        query += f' before:{date_before}'
    for kw in skip_keywords:
        query += f' -from:{kw} -subject:{kw}'

    messages = client.search_invoice_emails(query=query)
    print(f"  נמצאו {len(messages)} מיילים")

    if not messages:
        return []

    extractor = InvoiceExtractor()
    invoices  = []

    for i, msg in enumerate(messages, 1):
        combined = (msg['sender'] + ' ' + msg['subject']).lower()
        if any(kw in combined for kw in skip_keywords):
            continue

        print(f"  [{i:>3}/{len(messages)}] {msg['subject'][:50]}")
        attachments = client.get_attachments(msg['id'], msg['payload'])

        for att in attachments:
            if any(kw in att['filename'].lower() for kw in skip_keywords):
                continue

            print(f"         📄 {att['filename']}")

            # Classify first — only save if it's actually an invoice
            result = extractor.extract(att)
            if not result:
                continue

            if not result.get('is_invoice'):
                print(f"         ⏭️  לא חשבונית — מדלג")
                continue

            # Deduplication by invoice number
            inv_num = result.get('invoice_number')
            if inv_num and inv_num in seen_invoice_numbers:
                print(f"         🔁  חשבונית #{inv_num} כבר קיימת — מדלג")
                continue
            if inv_num:
                seen_invoice_numbers.add(inv_num)

            # Deduplication by file content (catches duplicates without invoice number)
            file_hash = hashlib.md5(att['data']).hexdigest()
            if file_hash in seen_hashes:
                print(f"         🔁  כפול (תוכן זהה) — מדלג")
                continue
            seen_hashes.add(file_hash)

            # Save file — prefix with account label to avoid collisions
            safe_name = f"{label}_{_safe_filename(att['filename'])}"
            file_path = os.path.join(out_dir, safe_name)
            if os.path.exists(file_path):
                base_n, ext = os.path.splitext(safe_name)
                file_path = os.path.join(out_dir, f"{base_n}_{i}{ext}")

            with open(file_path, 'wb') as f:
                f.write(att['data'])

            result['email_subject'] = msg['subject']
            result['email_date']    = msg['date']
            result['sender']        = msg['sender']
            result['account']       = label
            result['saved_file']    = os.path.abspath(file_path)
            invoices.append(result)

            amount = result.get('amount')
            sym = {'ILS': '₪', 'USD': '$', 'EUR': '€'}.get(result.get('currency', 'ILS'), '')
            print(f"         ✅ {sym}{amount:,.2f}" if amount else "         ⚠️  סכום לא זוהה")

    return invoices, client


def main():
    _check_env()

    from output_generator import OutputGenerator

    # Dates
    date_filter = os.environ.get('GMAIL_AFTER', '')
    date_before = os.environ.get('GMAIL_BEFORE', '')

    if not date_filter and not date_before and os.environ.get('AUTO_LAST_MONTH'):
        date_filter, date_before = _compute_last_month()
        print(f"📅 חודש אוטומטי: {date_filter} → {date_before}")

    # Skip keywords
    skip_keywords = [
        k.strip().lower()
        for k in os.environ.get('INCOME_SENDERS', 'fxponezone').split(',')
        if k.strip()
    ]

    # Single recipient for combined report
    recipient = os.environ.get('REPORT_EMAIL', 'amitshechter5@gmail.com')

    # Accounts to pull from
    accounts = [
        {'label': 'onezonejersey', 'token_file': 'token_onezone.json'},
        {'label': 'mymeluvo',      'token_file': 'token_meluvo.json'},
    ]

    print("\n╔══════════════════════════════════════╗")
    print("║    מחלץ חשבוניות מ-Gmail            ║")
    print(f"║    מושך מ-{len(accounts)} חשבונות                  ║")
    print("╚══════════════════════════════════════╝")

    # Create one combined output folder
    ts      = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_dir = f'הוצאות_{ts}'
    os.makedirs(out_dir, exist_ok=True)
    print(f"\n📂 תיקייה: {out_dir}")

    # Pull from all accounts
    all_invoices = []
    first_client = None
    seen_hashes          = set()
    seen_invoice_numbers = set()

    for account in accounts:
        result = pull_account(account, date_filter, date_before, skip_keywords, out_dir, seen_hashes, seen_invoice_numbers)
        if result:
            invoices, client = result
            all_invoices.extend(invoices)
            if first_client is None:
                first_client = client  # used to send the email

    if not all_invoices:
        print("\n⚠️  לא נמצאו חשבוניות")
        sys.exit(0)

    # Generate combined Excel
    generator  = OutputGenerator()
    excel_path = generator.create_excel(all_invoices, os.path.join(out_dir, 'הוצאות.xlsx'))
    total      = sum(inv.get('amount', 0) or 0 for inv in all_invoices if inv.get('currency', 'ILS') == 'ILS')

    print(f"\n╔══════════════════════════════════════╗")
    print(f"║  ✅  הושלם!                          ║")
    print(f"║  📁  {out_dir:<36}║")
    print(f"║  🧾  חשבוניות: {len(all_invoices):<26}║")
    print(f"║  💸  סה\"כ: ₪{total:>23,.2f}  ║")
    print(f"╚══════════════════════════════════════╝")

    # Send one combined email
    if recipient and first_client:
        period = f"{date_filter} → {date_before}" if date_filter else "כל הזמן"
        body = (
            f"שלום,\n\n"
            f"מצורף דוח הוצאות לתקופה: {period}\n"
            f"חשבונות: {', '.join(a['label'] for a in accounts)}\n"
            f"סה\"כ הוצאות (ILS): ₪{total:,.2f}\n"
            f"מספר חשבוניות: {len(all_invoices)}\n\n"
            f"מצורפים: קובץ Excel + כל קבצי החשבוניות.\n\n"
            f"נשלח אוטומטית."
        )
        print(f"\n📤 שולח מייל ל-{recipient}…")
        try:
            first_client.send_report(
                to=recipient,
                subject=f"דוח הוצאות — {period}",
                body=body,
                folder_path=out_dir,
                excel_path=excel_path,
            )
        except Exception as e:
            print(f"  ⚠️  שגיאה בשליחת מייל: {e}")


if __name__ == '__main__':
    main()
