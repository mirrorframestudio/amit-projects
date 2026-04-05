"""
Google Drive uploader — uploads P&L Excel to Google Drive.

Reuses OAuth credentials from invoice-extractor project.
On first run, opens browser for consent (adds Drive scope).
"""

import json
import logging
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from . import settings

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",  # only files created by this app
]

# Paths — reuse credentials from invoice-extractor
_CREDS_FILE = Path(__file__).resolve().parent.parent.parent / "invoice-extractor" / "credentials.json"
_TOKEN_FILE = Path(__file__).resolve().parent.parent / "drive_token.json"

# Drive folder name where the P&L file goes
DRIVE_FOLDER_NAME = getattr(settings, "DRIVE_FOLDER", None) or "OneZoneJersey P&L"


def _get_credentials() -> Credentials:
    """Load or create OAuth credentials with Drive scope."""
    creds = None

    if _TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(_TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Refreshing Drive token...")
            creds.refresh(Request())
        else:
            if not _CREDS_FILE.exists():
                raise FileNotFoundError(
                    f"Google credentials not found: {_CREDS_FILE}\n"
                    "Copy credentials.json from invoice-extractor folder."
                )
            logger.info("Starting OAuth flow for Google Drive (browser will open)...")
            flow = InstalledAppFlow.from_client_secrets_file(str(_CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        # Save token
        _TOKEN_FILE.write_text(json.dumps({
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": SCOPES,
        }))
        logger.info("Drive token saved: %s", _TOKEN_FILE)

    return creds


def _find_or_create_folder(service, folder_name: str) -> str:
    """Find or create a folder in Google Drive root. Returns folder ID."""
    query = (
        f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' "
        "and trashed = false"
    )
    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = results.get("files", [])

    if files:
        folder_id = files[0]["id"]
        logger.info("Found Drive folder '%s' (ID: %s)", folder_name, folder_id)
        return folder_id

    # Create folder
    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    folder_id = folder["id"]
    logger.info("Created Drive folder '%s' (ID: %s)", folder_name, folder_id)
    return folder_id


def upload(file_path: str | Path) -> str:
    """
    Upload/update Excel file on Google Drive.
    Returns the file's web view link.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    creds = _get_credentials()
    service = build("drive", "v3", credentials=creds)

    # Find or create the target folder
    folder_id = _find_or_create_folder(service, DRIVE_FOLDER_NAME)

    # Check if file already exists in folder (update instead of duplicate)
    file_name = file_path.name
    query = f"name = '{file_name}' and '{folder_id}' in parents and trashed = false"
    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    existing = results.get("files", [])

    media = MediaFileUpload(
        str(file_path),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    if existing:
        # Update existing file
        file_id = existing[0]["id"]
        service.files().update(fileId=file_id, media_body=media).execute()
        logger.info("Updated '%s' on Drive (ID: %s)", file_name, file_id)
    else:
        # Create new file
        metadata = {"name": file_name, "parents": [folder_id]}
        result = service.files().create(body=metadata, media_body=media, fields="id").execute()
        file_id = result["id"]
        logger.info("Uploaded '%s' to Drive (ID: %s)", file_name, file_id)

        # Share with anyone who has the link
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
        ).execute()
        # Also share the folder
        try:
            service.permissions().create(
                fileId=folder_id,
                body={"type": "anyone", "role": "reader"},
            ).execute()
        except Exception:
            pass  # folder may already be shared
        logger.info("Shared file and folder with link access")

    # Get shareable link
    link = f"https://drive.google.com/file/d/{file_id}/view"
    logger.info("Drive link: %s", link)
    return link
