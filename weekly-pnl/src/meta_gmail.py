"""
Fetch Meta Ads invoice CSVs from Gmail (mymeluvo@gmail.com),
parse them, sum charges per week, and convert ILS → USD.

Reuses the invoice-extractor Google Cloud OAuth credentials.
"""
import base64
import csv
import io
import json
import logging
import os
import re
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from .settings import SETTINGS

logger = logging.getLogger(__name__)

# Paths to invoice-extractor credentials (reuse existing auth)
INVOICE_EXTRACTOR_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "invoice-extractor")
)
CREDENTIALS_FILE = os.path.join(INVOICE_EXTRACTOR_DIR, "credentials.json")
TOKEN_FILE = os.path.join(INVOICE_EXTRACTOR_DIR, "token_meluvo.json")


def _get_gmail_service():
    """Build Gmail API service using existing token_meluvo.json."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
    ]

    creds = None
    if os.path.isfile(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.isfile(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"Google credentials not found at {CREDENTIALS_FILE}. "
                    "Run the invoice-extractor setup_auth.py first."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def _search_meta_emails(service, after_date: date, before_date: date) -> List[dict]:
    """Search Gmail for Meta Ads receipt emails in a date range."""
    # Meta sends receipts from facebookmail.com or meta.com
    after_str = after_date.strftime("%Y/%m/%d")
    before_str = (before_date + timedelta(days=1)).strftime("%Y/%m/%d")

    query = (
        f"from:(facebookmail.com OR meta.com) "
        f"subject:(receipt OR invoice OR חשבונית OR קבלה OR חיוב) "
        f"after:{after_str} before:{before_str} "
        f"has:attachment"
    )
    logger.info(f"Gmail search query: {query}")

    results = service.users().messages().list(
        userId="me", q=query, maxResults=50
    ).execute()

    messages = results.get("messages", [])
    logger.info(f"Found {len(messages)} Meta emails")
    return messages


def _download_csv_attachments(service, message_id: str) -> List[str]:
    """Download CSV attachments from a Gmail message. Returns list of CSV text content."""
    msg = service.users().messages().get(
        userId="me", id=message_id, format="full"
    ).execute()

    csvs = []
    parts = msg.get("payload", {}).get("parts", [])

    for part in parts:
        filename = part.get("filename", "")
        if not filename.lower().endswith(".csv"):
            continue

        body = part.get("body", {})
        att_id = body.get("attachmentId")
        if att_id:
            att = service.users().messages().attachments().get(
                userId="me", messageId=message_id, id=att_id
            ).execute()
            data = base64.urlsafe_b64decode(att["data"])
            # Try UTF-8, fallback to UTF-8-sig (BOM), then latin-1
            for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
                try:
                    text = data.decode(encoding)
                    csvs.append(text)
                    logger.info(f"Downloaded CSV attachment: {filename}")
                    break
                except UnicodeDecodeError:
                    continue

    return csvs


def _parse_meta_invoice_csv(csv_text: str) -> List[Tuple[date, float, str]]:
    """
    Parse a Meta Ads invoice CSV (Hebrew format).
    Returns list of (date, amount, currency) tuples.

    Expected format (lines with date,transaction_id,amount,currency):
    27.2.2026,26053889440967640-26053889494300968,628.89,ILS
    """
    transactions = []
    lines = csv_text.strip().split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Look for lines matching: DD.MM.YYYY,transaction_id,amount,currency
        # Date pattern: 1-2 digit day, 1-2 digit month, 4 digit year
        match = re.match(
            r"(\d{1,2})\.(\d{1,2})\.(\d{4}),([^,]+),([\d,]+\.?\d*),(\w+)",
            line,
        )
        if match:
            day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
            try:
                txn_date = date(year, month, day)
            except ValueError:
                continue

            amount_str = match.group(5).replace(",", "")
            try:
                amount = float(amount_str)
            except ValueError:
                continue

            currency = match.group(6).strip()
            transactions.append((txn_date, amount, currency))

    logger.info(f"Parsed {len(transactions)} transactions from Meta CSV")
    return transactions


def _sum_for_week(
    transactions: List[Tuple[date, float, str]],
    week_start: date,
    week_end: date,
) -> float:
    """Sum transaction amounts that fall within the target week. Returns ILS."""
    total_ils = 0.0
    count = 0
    for txn_date, amount, currency in transactions:
        if week_start <= txn_date <= week_end:
            if currency.upper() == "ILS":
                total_ils += amount
                count += 1
            elif currency.upper() == "USD":
                total_ils += amount * SETTINGS.ILS_USD_RATE
                count += 1

    logger.info(
        f"Week {week_start}–{week_end}: {count} transactions, "
        f"{total_ils:.2f} ILS"
    )
    return total_ils


def fetch_meta_spend_from_gmail(
    week_start: date,
    week_end: date,
) -> Tuple[float, bool]:
    """
    Fetch Meta Ads spend from Gmail for a specific week.

    Returns (spend_usd, found).
    """
    try:
        service = _get_gmail_service()
    except Exception as e:
        logger.error(f"Failed to connect to Gmail: {e}")
        return 0.0, False

    # Search wider range to catch invoices that cover the target week
    search_start = week_start - timedelta(days=7)
    search_end = week_end + timedelta(days=14)

    messages = _search_meta_emails(service, search_start, search_end)
    if not messages:
        logger.warning("No Meta Ads emails found in Gmail")
        return 0.0, False

    # Download and parse all CSV attachments
    all_transactions = []
    for msg in messages:
        csvs = _download_csv_attachments(service, msg["id"])
        for csv_text in csvs:
            txns = _parse_meta_invoice_csv(csv_text)
            all_transactions.extend(txns)

    if not all_transactions:
        logger.warning("No transaction data found in Meta CSV attachments")
        return 0.0, False

    # Sum transactions for the target week
    spend_usd = _sum_for_week(all_transactions, week_start, week_end)

    if spend_usd > 0:
        return spend_usd, True
    else:
        logger.warning(f"No Meta transactions found for week {week_start}–{week_end}")
        return 0.0, False


def load_meta_invoices_from_folder(
    week_start: date,
    week_end: date,
    folder: str = "./inputs/meta_invoices",
) -> Tuple[float, bool]:
    """
    Alternative: load Meta invoice CSVs from a local folder.
    Useful if you manually download invoices.
    """
    if not os.path.isdir(folder):
        return 0.0, False

    all_transactions = []
    for fname in os.listdir(folder):
        if fname.lower().endswith(".csv"):
            filepath = os.path.join(folder, fname)
            try:
                with open(filepath, encoding="utf-8-sig") as f:
                    csv_text = f.read()
                txns = _parse_meta_invoice_csv(csv_text)
                all_transactions.extend(txns)
            except Exception as e:
                logger.warning(f"Failed to read {filepath}: {e}")

    if not all_transactions:
        return 0.0, False

    spend_usd = _sum_for_week(all_transactions, week_start, week_end)
    return spend_usd, spend_usd > 0
