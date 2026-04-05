import os
import base64
import zipfile
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
]

INVOICE_MIME_TYPES = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
}


class GmailClient:
    def __init__(self, token_file='token.json'):
        self.token_file = token_file
        self.service = self._authenticate()

    def _authenticate(self):
        creds = None
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            with open(self.token_file, 'w') as f:
                f.write(creds.to_json())

        return build('gmail', 'v1', credentials=creds)

    def search_invoice_emails(self, query=None):
        if query is None:
            query = (
                'has:attachment ('
                'invoice OR חשבונית OR receipt OR קבלה OR '
                'חשבון OR "tax invoice" OR filename:pdf OR filename:xls'
                ')'
            )

        # שלב 1: אסוף את כל ה-IDs תחילה (מהיר)
        msg_ids = []
        page_token = None
        while True:
            resp = self.service.users().messages().list(
                userId='me',
                q=query,
                pageToken=page_token,
                maxResults=500
            ).execute()
            msg_ids.extend([m['id'] for m in resp.get('messages', [])])
            page_token = resp.get('nextPageToken')
            if not page_token:
                break

        print(f"נמצאו {len(msg_ids)} מיילים — מוריד פרטים...")

        # שלב 2: הורד פרטים לכל ID (עם progress)
        messages = []
        for i, msg_id in enumerate(msg_ids, 1):
            if i % 10 == 0:
                print(f"  {i}/{len(msg_ids)}...", end='\r')
            details = self._get_message_details(msg_id)
            if details:
                messages.append(details)

        print()
        return messages

    def _get_message_details(self, msg_id):
        msg = self.service.users().messages().get(
            userId='me', id=msg_id, format='full'
        ).execute()

        headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}

        return {
            'id': msg_id,
            'subject': headers.get('Subject', '(ללא נושא)'),
            'sender': headers.get('From', ''),
            'date': headers.get('Date', ''),
            'payload': msg['payload'],
        }

    def get_attachments(self, msg_id, payload):
        attachments = []
        self._walk_parts(msg_id, payload, attachments)
        return attachments

    def _walk_parts(self, msg_id, part, attachments):
        filename = part.get('filename', '')
        mime_type = part.get('mimeType', '')
        body = part.get('body', {})

        if filename and body.get('attachmentId'):
            ext = filename.rsplit('.', 1)[-1].lower()
            if ext in INVOICE_MIME_TYPES or any(t in mime_type for t in ['pdf', 'image', 'excel', 'spreadsheet', 'csv']):
                data = self._download_attachment(msg_id, body['attachmentId'])
                if data:
                    attachments.append({
                        'filename': filename,
                        'mime_type': mime_type,
                        'data': data,
                    })

        for sub in part.get('parts', []):
            self._walk_parts(msg_id, sub, attachments)

    def send_report(self, to: str, subject: str, body: str, folder_path: str, excel_path: str):
        """Send email with Excel + all invoice files as individual attachments."""
        msg = MIMEMultipart()
        msg['to'] = to
        msg['subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        attached = 0

        # Attach Excel first
        if os.path.exists(excel_path):
            self._attach_file(msg, excel_path)
            attached += 1

        # Attach each invoice file individually
        if os.path.isdir(folder_path):
            for fname in sorted(os.listdir(folder_path)):
                fpath = os.path.join(folder_path, fname)
                if os.path.isfile(fpath) and not fname.endswith('.xlsx'):
                    self._attach_file(msg, fpath)
                    attached += 1

        print(f"  📎 מצורפים {attached} קבצים")
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        self.service.users().messages().send(
            userId='me', body={'raw': raw}
        ).execute()
        print(f"  ✉️  נשלח ל: {to}")

    def _attach_file(self, msg, file_path: str):
        with open(file_path, 'rb') as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())
        encoders.encode_base64(part)
        fname = os.path.basename(file_path)
        part.add_header('Content-Disposition', f'attachment; filename="{fname}"')
        msg.attach(part)

    def _download_attachment(self, msg_id, attachment_id):
        try:
            att = self.service.users().messages().attachments().get(
                userId='me', messageId=msg_id, id=attachment_id
            ).execute()
            return base64.urlsafe_b64decode(att['data'])
        except Exception as e:
            print(f"  ⚠️  שגיאה בהורדת קובץ: {e}")
            return None
