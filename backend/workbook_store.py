import os
import tempfile
from pathlib import Path

import psycopg

from backend.storage import BACKUP_RETENTION, EXCEL_FILE, workbook_sha256


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
WORKBOOK_ID = os.getenv("WORKBOOK_ID", "courses-management")


def is_enabled() -> bool:
    return bool(DATABASE_URL)


def _replace_local(content: bytes) -> None:
    EXCEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix="sheet-", suffix=".xlsx", dir=EXCEL_FILE.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, EXCEL_FILE)
    finally:
        Path(temp_name).unlink(missing_ok=True)


def initialize_remote_workbook() -> None:
    """Seed Neon once, or restore the latest durable workbook to local disk."""
    if not is_enabled():
        return
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT content FROM app_workbooks WHERE workbook_id = %s",
                (WORKBOOK_ID,),
            )
            row = cur.fetchone()
            if row:
                _replace_local(bytes(row[0]))
                return
            if not EXCEL_FILE.exists():
                raise RuntimeError("Cannot seed Neon because the local workbook is missing")
            content = EXCEL_FILE.read_bytes()
            cur.execute(
                """INSERT INTO app_workbooks (workbook_id, content, version, sha256)
                   VALUES (%s, %s, 1, %s)""",
                (WORKBOOK_ID, content, workbook_sha256()),
            )


def pull_remote_workbook() -> bool:
    """Refresh the local working copy when another process published a new version."""
    if not is_enabled():
        return False
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT content, sha256 FROM app_workbooks WHERE workbook_id = %s",
                (WORKBOOK_ID,),
            )
            row = cur.fetchone()
    if not row or row[1] == workbook_sha256():
        return False
    _replace_local(bytes(row[0]))
    return True


def publish_local_workbook(reason: str) -> int | None:
    """Publish atomically and retain the previous workbook as a durable backup."""
    if not is_enabled():
        return None
    content = EXCEL_FILE.read_bytes()
    digest = workbook_sha256()
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT content, version, sha256 FROM app_workbooks
                   WHERE workbook_id = %s FOR UPDATE""",
                (WORKBOOK_ID,),
            )
            current = cur.fetchone()
            if current is None:
                cur.execute(
                    """INSERT INTO app_workbooks (workbook_id, content, version, sha256)
                       VALUES (%s, %s, 1, %s)""",
                    (WORKBOOK_ID, content, digest),
                )
                return 1
            old_content, old_version, old_digest = current
            if old_digest == digest:
                return int(old_version)
            cur.execute(
                """INSERT INTO workbook_backups
                       (workbook_id, version, content, sha256, reason)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (workbook_id, version) DO NOTHING""",
                (WORKBOOK_ID, old_version, old_content, old_digest, reason[:120]),
            )
            new_version = int(old_version) + 1
            cur.execute(
                """UPDATE app_workbooks
                   SET content = %s, version = %s, sha256 = %s, updated_at = now()
                   WHERE workbook_id = %s""",
                (content, new_version, digest, WORKBOOK_ID),
            )
            cur.execute(
                """DELETE FROM workbook_backups
                   WHERE backup_id IN (
                     SELECT backup_id FROM workbook_backups
                     WHERE workbook_id = %s
                     ORDER BY version DESC OFFSET %s
                   )""",
                (WORKBOOK_ID, BACKUP_RETENTION),
            )
            return new_version


def remote_status() -> dict:
    if not is_enabled():
        return {"backend": "local", "enabled": False}
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT version, updated_at,
                          (SELECT count(*) FROM workbook_backups WHERE workbook_id = %s)
                   FROM app_workbooks WHERE workbook_id = %s""",
                (WORKBOOK_ID, WORKBOOK_ID),
            )
            row = cur.fetchone()
    return {
        "backend": "neon",
        "enabled": True,
        "version": int(row[0]) if row else None,
        "updated_at": row[1].isoformat() if row else None,
        "backup_count": int(row[2]) if row else 0,
    }
