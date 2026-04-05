"""
Send P&L report via Gmail (mymeluvo@gmail.com).
Reuses invoice-extractor OAuth credentials with gmail.send scope.
"""
import base64
import logging
import os
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders

logger = logging.getLogger(__name__)

INVOICE_EXTRACTOR_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "invoice-extractor")
)
CREDENTIALS_FILE = os.path.join(INVOICE_EXTRACTOR_DIR, "credentials.json")
TOKEN_FILE = os.path.join(INVOICE_EXTRACTOR_DIR, "token_meluvo.json")


def _get_gmail_service():
    """Build Gmail API service with send permission."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
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
                    f"Google credentials not found at {CREDENTIALS_FILE}"
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def send_pnl_report(
    to_email: str,
    subject: str,
    body_text: str,
    excel_path: str,
) -> bool:
    """Send P&L Excel report as email attachment."""
    try:
        service = _get_gmail_service()

        msg = MIMEMultipart()
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        # Attach Excel file
        filename = os.path.basename(excel_path)
        with open(excel_path, "rb") as f:
            part = MIMEBase(
                "application",
                "vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        logger.info(f"Report emailed to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
