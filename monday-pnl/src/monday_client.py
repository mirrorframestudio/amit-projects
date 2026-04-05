"""
Monday.com GraphQL API client.

Fetches all items (with subitems) from the Orders board with robust pagination,
rate-limit handling, and exponential backoff on errors.
"""

import logging
import time
from typing import Any

import requests

from . import settings

logger = logging.getLogger(__name__)

_MAX_RETRIES = 5
_INITIAL_BACKOFF = 2.0
_PAGE_LIMIT = 100


# Fetches parent items + their subitems in a single query
_ITEMS_PAGE_QUERY = """
query ($boardId: ID!, $limit: Int!, $cursor: String) {
  boards(ids: [$boardId]) {
    items_page(limit: $limit, cursor: $cursor) {
      cursor
      items {
        id
        name
        created_at
        updated_at
        column_values {
          id
          text
          value
          type
        }
        subitems {
          id
          name
          column_values {
            id
            text
            value
            type
          }
        }
      }
    }
  }
}
"""


def _request_with_retry(payload: dict) -> dict:
    """Send a GraphQL request with exponential backoff on transient errors."""
    headers = {
        "Authorization": settings.MONDAY_API_TOKEN,
        "Content-Type": "application/json",
        "API-Version": "2024-10",
    }
    backoff = _INITIAL_BACKOFF

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = requests.post(
                settings.MONDAY_API_URL,
                json=payload,
                headers=headers,
                timeout=30,
            )

            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", backoff))
                logger.warning(
                    "Rate limited (429). Waiting %.1fs (attempt %d/%d)",
                    retry_after, attempt, _MAX_RETRIES,
                )
                time.sleep(retry_after)
                backoff *= 2
                continue

            if resp.status_code >= 500:
                logger.warning(
                    "Server error %d. Retrying in %.1fs (attempt %d/%d)",
                    resp.status_code, backoff, attempt, _MAX_RETRIES,
                )
                time.sleep(backoff)
                backoff *= 2
                continue

            resp.raise_for_status()
            data = resp.json()

            if "errors" in data:
                err_msg = data["errors"][0].get("message", str(data["errors"]))
                if "complexity" in err_msg.lower() or "rate" in err_msg.lower():
                    logger.warning(
                        "Complexity/rate error: %s. Waiting %.1fs (attempt %d/%d)",
                        err_msg, backoff, attempt, _MAX_RETRIES,
                    )
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                raise RuntimeError(f"Monday GraphQL error: {err_msg}")

            return data

        except requests.exceptions.ConnectionError as exc:
            logger.warning(
                "Connection error: %s. Retrying in %.1fs (attempt %d/%d)",
                exc, backoff, attempt, _MAX_RETRIES,
            )
            time.sleep(backoff)
            backoff *= 2

    raise RuntimeError(f"Monday API request failed after {_MAX_RETRIES} attempts")


def fetch_all_items() -> list[dict[str, Any]]:
    """
    Fetch every item from the configured Monday board (including subitems).
    Returns a list of raw item dicts.
    """
    if not settings.MONDAY_API_TOKEN:
        raise ValueError("MONDAY_API_TOKEN is not set in .env")
    if not settings.MONDAY_BOARD_ID:
        raise ValueError("MONDAY_BOARD_ID is not set in .env")

    all_items: list[dict] = []
    cursor: str | None = None
    page = 0

    while True:
        page += 1
        variables: dict[str, Any] = {
            "boardId": settings.MONDAY_BOARD_ID,
            "limit": _PAGE_LIMIT,
        }
        if cursor:
            variables["cursor"] = cursor

        logger.info("Fetching page %d (cursor=%s)...", page, cursor or "START")

        data = _request_with_retry({
            "query": _ITEMS_PAGE_QUERY,
            "variables": variables,
        })

        boards = data.get("data", {}).get("boards", [])
        if not boards:
            logger.warning("No boards found for ID %s", settings.MONDAY_BOARD_ID)
            break

        items_page = boards[0].get("items_page", {})
        items = items_page.get("items", [])
        next_cursor = items_page.get("cursor")

        all_items.extend(items)
        logger.info("  -> Got %d items (total so far: %d)", len(items), len(all_items))

        if not next_cursor or len(items) < _PAGE_LIMIT:
            break
        cursor = next_cursor

    logger.info("Finished fetching. Total items: %d", len(all_items))
    return all_items
