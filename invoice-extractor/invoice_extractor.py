import re
import io
import json
import base64
import anthropic
import pdfplumber
import pandas as pd


AMOUNT_PATTERNS = [
    r'סה["\u05d4]?כ\s*[:\s]\s*([\d,]+\.?\d*)',
    r'לתשלום\s*[:\s]\s*([\d,]+\.?\d*)',
    r'סכום\s+כולל\s*[:\s]\s*([\d,]+\.?\d*)',
    r'total\s*[:\s]\s*([\d,]+\.?\d*)',
    r'amount\s*due\s*[:\s]\s*([\d,]+\.?\d*)',
    r'grand\s+total\s*[:\s]\s*([\d,]+\.?\d*)',
    r'₪\s*([\d,]+\.?\d*)',
    r'([\d,]+\.?\d*)\s*₪',
    r'ILS\s*([\d,]+\.?\d*)',
]

INVOICE_NUM_PATTERNS = [
    r'חשבונית\s+(?:מס[\'״\.]?|מספר)\s*[:\s]*(\d+)',
    r'מס[\'״\.]?\s*חשבונית\s*[:\s]*(\d+)',
    r'invoice\s+(?:no|number|#)\s*[:\s]*(\d+)',
    r'inv[.\s-]*(\d{4,})',
]

INVOICE_KEYWORDS = [
    # עברית
    'חשבונית', 'קבלה', 'ח"ע', 'חשבון עסקה', 'חשבון מס',
    'לתשלום', 'סכום לתשלום', 'סה"כ לתשלום', 'מע"מ',
    # אנגלית
    'invoice', 'receipt', 'tax invoice', 'bill to', 'sold to',
    'amount due', 'payment due', 'total due', 'balance due',
    'remit to', 'purchase order', 'order confirmation',
    'vat', 'tax no', 'tax id',
]

CLAUDE_MODEL = "claude-haiku-4-5-20251001"

VISION_PROMPT = """\
Look at this document and determine if it is an invoice, receipt, or bill.
Reply with valid JSON only — no markdown, no explanation:
{
  "is_invoice": <true if this is an invoice/receipt/bill/tax-invoice, false for anything else>,
  "amount": <final total as a number, no currency symbols, or null>,
  "currency": <"ILS", "USD" or "EUR" — default "ILS">,
  "invoice_number": <invoice/receipt number as string, or null>,
  "supplier": <vendor / company name, or null>,
  "date": <date in YYYY-MM-DD, or null>
}"""


class InvoiceExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic()

    # ------------------------------------------------------------------ #
    #  Public                                                              #
    # ------------------------------------------------------------------ #

    def extract(self, attachment: dict) -> dict | None:
        mime = attachment['mime_type'].lower()
        fname = attachment['filename'].lower()

        if 'pdf' in mime or fname.endswith('.pdf'):
            return self._from_pdf(attachment)

        if any(t in mime for t in ('image', 'png', 'jpg', 'jpeg', 'gif', 'webp')) \
                or fname.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            return self._from_image(attachment)

        if any(t in mime for t in ('excel', 'spreadsheet', 'csv')) \
                or fname.endswith(('.xls', '.xlsx', '.csv')):
            return self._from_excel(attachment)

        return None

    # ------------------------------------------------------------------ #
    #  PDF                                                                 #
    # ------------------------------------------------------------------ #

    def _from_pdf(self, attachment: dict) -> dict:
        try:
            text = self._pdf_to_text(attachment['data'])
            if text.strip():
                amount = self._find_amount(text)
                is_inv = self._has_invoice_keywords(text)  # keywords required — amount alone is not enough
                return {
                    'filename': attachment['filename'],
                    'is_invoice': is_inv,
                    'amount': amount,
                    'invoice_number': self._find_invoice_number(text),
                    'currency': self._detect_currency(text),
                    'supplier': None,
                    'date': None,
                }
            # Scanned / image-only PDF → render first page and send to Vision
            return self._pdf_via_vision(attachment)
        except Exception as e:
            print(f"  ⚠️  PDF error ({attachment['filename']}): {e}")
            return {'filename': attachment['filename'], 'is_invoice': False, 'amount': None, 'error': str(e)}

    def _pdf_to_text(self, data: bytes) -> str:
        text = ""
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    def _pdf_via_vision(self, attachment: dict) -> dict:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=attachment['data'], filetype="pdf")
            page = doc[0]
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            b64 = base64.standard_b64encode(img_bytes).decode()
            return self._call_claude_vision(b64, "image/png", attachment['filename'])
        except ImportError:
            print("  ℹ️  PyMuPDF לא מותקן — מדלג על PDF סרוק")
            return {'filename': attachment['filename'], 'amount': None}

    # ------------------------------------------------------------------ #
    #  Image                                                               #
    # ------------------------------------------------------------------ #

    def _from_image(self, attachment: dict) -> dict:
        mime = attachment['mime_type']
        if mime not in ('image/jpeg', 'image/png', 'image/gif', 'image/webp'):
            mime = 'image/jpeg'
        b64 = base64.standard_b64encode(attachment['data']).decode()
        return self._call_claude_vision(b64, mime, attachment['filename'])

    # ------------------------------------------------------------------ #
    #  Excel / CSV                                                         #
    # ------------------------------------------------------------------ #

    def _from_excel(self, attachment: dict) -> dict:
        try:
            file_obj = io.BytesIO(attachment['data'])
            if attachment['filename'].lower().endswith('.csv'):
                df = pd.read_csv(file_obj)
            else:
                df = pd.read_excel(file_obj)

            amount_cols = [
                c for c in df.columns
                if any(kw in str(c).lower() for kw in
                       ['amount', 'total', 'סכום', 'סה"כ', 'price', 'מחיר', 'לתשלום'])
            ]

            if amount_cols:
                total = pd.to_numeric(df[amount_cols[0]], errors='coerce').sum()
            else:
                num_cols = df.select_dtypes(include='number').columns
                total = df[num_cols[-1]].sum() if len(num_cols) else None

            return {
                'filename': attachment['filename'],
                'is_invoice': True,
                'amount': float(total) if total is not None else None,
                'invoice_number': None,
                'currency': 'ILS',
                'supplier': None,
                'date': None,
            }
        except Exception as e:
            print(f"  ⚠️  Excel error ({attachment['filename']}): {e}")
            return {'filename': attachment['filename'], 'amount': None, 'error': str(e)}

    # ------------------------------------------------------------------ #
    #  Claude Vision                                                       #
    # ------------------------------------------------------------------ #

    def _call_claude_vision(self, b64_data: str, media_type: str, filename: str) -> dict:
        try:
            response = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=400,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }],
            )

            raw = response.content[0].text.strip()
            # Strip markdown code fences if present
            if '```' in raw:
                m = re.search(r'\{.*\}', raw, re.DOTALL)
                raw = m.group() if m else raw

            data = json.loads(raw)
            data['filename'] = filename
            return data

        except json.JSONDecodeError as e:
            print(f"  ⚠️  Claude JSON error ({filename}): {e}")
            return {'filename': filename, 'amount': None, 'error': f'JSON parse error: {e}'}
        except Exception as e:
            print(f"  ⚠️  Claude Vision error ({filename}): {e}")
            return {'filename': filename, 'amount': None, 'error': str(e)}

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #

    def _has_invoice_keywords(self, text: str) -> bool:
        text_lower = text.lower()
        return any(kw.lower() in text_lower for kw in INVOICE_KEYWORDS)

    def _find_amount(self, text: str) -> float | None:
        for pattern in AMOUNT_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    return float(matches[-1].replace(',', ''))
                except ValueError:
                    continue
        return None

    def _find_invoice_number(self, text: str) -> str | None:
        for pattern in INVOICE_NUM_PATTERNS:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1)
        return None

    def _detect_currency(self, text: str) -> str:
        if '₪' in text or 'ILS' in text or 'שקל' in text:
            return 'ILS'
        if '$' in text or 'USD' in text:
            return 'USD'
        if '€' in text or 'EUR' in text:
            return 'EUR'
        return 'ILS'
