import hashlib

import psycopg

from backend.storage import BACKUP_RETENTION
from backend.workbook_store import DATABASE_URL, is_enabled


def save_asset(asset_key: str, content_type: str, content: bytes) -> int:
    if not is_enabled():
        raise RuntimeError("Durable asset storage requires DATABASE_URL")
    digest = hashlib.sha256(content).hexdigest()
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT content_type, content, sha256, version
                   FROM app_assets WHERE asset_key = %s FOR UPDATE""",
                (asset_key,),
            )
            current = cur.fetchone()
            if current is None:
                cur.execute(
                    """INSERT INTO app_assets
                       (asset_key, content_type, content, sha256, version)
                       VALUES (%s, %s, %s, %s, 1)""",
                    (asset_key, content_type, content, digest),
                )
                return 1
            old_type, old_content, old_digest, old_version = current
            if old_digest == digest and old_type == content_type:
                return int(old_version)
            cur.execute(
                """INSERT INTO app_asset_backups
                       (asset_key, version, content_type, content, sha256)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (asset_key, version) DO NOTHING""",
                (asset_key, old_version, old_type, old_content, old_digest),
            )
            new_version = int(old_version) + 1
            cur.execute(
                """UPDATE app_assets
                   SET content_type = %s, content = %s, sha256 = %s,
                       version = %s, updated_at = now()
                   WHERE asset_key = %s""",
                (content_type, content, digest, new_version, asset_key),
            )
            cur.execute(
                """DELETE FROM app_asset_backups
                   WHERE backup_id IN (
                     SELECT backup_id FROM app_asset_backups
                     WHERE asset_key = %s
                     ORDER BY version DESC OFFSET %s
                   )""",
                (asset_key, BACKUP_RETENTION),
            )
            return new_version


def get_asset(asset_key: str) -> tuple[str, bytes, str] | None:
    if not is_enabled():
        return None
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT content_type, content, sha256 FROM app_assets WHERE asset_key = %s",
                (asset_key,),
            )
            row = cur.fetchone()
    return (str(row[0]), bytes(row[1]), str(row[2])) if row else None
