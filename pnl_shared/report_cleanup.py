"""
pnl_shared.report_cleanup — auto-deletes old Excel report files.

Keeps reports for KEEP_DAYS (default 30), deletes everything older.
Designed to run at the end of each pipeline so reports don't pile up.

Usage:
    from pnl_shared.report_cleanup import cleanup_old_reports
    cleanup_old_reports(reports_dir, keep_days=30, pattern="*.xlsx")
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)


def cleanup_old_reports(
    reports_dir: str | Path,
    keep_days: int = 30,
    pattern: str = "*.xlsx",
    dry_run: bool = False,
) -> list[Path]:
    """
    Delete report files older than ``keep_days`` days.

    Args:
        reports_dir: Directory containing report files.
        keep_days:   Files older than this many days are deleted. Default: 30.
        pattern:     Glob pattern for report files. Default: "*.xlsx".
        dry_run:     If True, log what would be deleted but don't actually delete.

    Returns:
        List of Path objects that were deleted (or would be deleted in dry_run).
    """
    reports_dir = Path(reports_dir)
    if not reports_dir.exists():
        logger.debug("cleanup_old_reports: directory does not exist: %s", reports_dir)
        return []

    cutoff = datetime.now() - timedelta(days=keep_days)
    deleted: list[Path] = []

    files = sorted(reports_dir.glob(pattern))
    if not files:
        logger.debug("cleanup_old_reports: no files matching '%s' in %s", pattern, reports_dir)
        return []

    for f in files:
        try:
            mtime = datetime.fromtimestamp(f.stat().st_mtime)
            age_days = (datetime.now() - mtime).days
            if mtime < cutoff:
                if dry_run:
                    logger.info("cleanup [dry-run] would delete: %s (age %d days)", f.name, age_days)
                else:
                    f.unlink()
                    logger.info("cleanup deleted: %s (age %d days)", f.name, age_days)
                deleted.append(f)
            else:
                logger.debug("cleanup keeping: %s (age %d days)", f.name, age_days)
        except Exception as exc:
            logger.warning("cleanup failed to process %s: %s", f, exc)

    if deleted:
        action = "would delete" if dry_run else "deleted"
        logger.info("cleanup: %s %d file(s) older than %d days from %s",
                    action, len(deleted), keep_days, reports_dir)
    else:
        logger.info("cleanup: nothing to delete in %s (all files within %d days)",
                    reports_dir, keep_days)

    return deleted
