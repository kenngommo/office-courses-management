import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SEED_EXCEL_FILE = PROJECT_ROOT / "sheet.xlsx"
DATA_DIR = Path(os.getenv("DATA_DIR", str(PROJECT_ROOT))).resolve()
PERSISTENT_STORAGE_CONFIGURED = bool(os.getenv("DATA_DIR", "").strip())
EXCEL_FILE = DATA_DIR / "sheet.xlsx"
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", str(DATA_DIR / "backups"))).resolve()
BACKUP_RETENTION = max(1, int(os.getenv("BACKUP_RETENTION", "30")))

_backup_lock = threading.Lock()


def initialize_storage() -> None:
    """Create the writable data area and seed it on the first deployment."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if not EXCEL_FILE.exists() and SEED_EXCEL_FILE.exists() and EXCEL_FILE != SEED_EXCEL_FILE:
        shutil.copy2(SEED_EXCEL_FILE, EXCEL_FILE)


def create_backup(reason: str = "change") -> Path | None:
    """Keep timestamped workbook snapshots and prune the oldest ones."""
    if not EXCEL_FILE.exists():
        return None
    safe_reason = "".join(c if c.isalnum() or c in "-_" else "-" for c in reason).strip("-") or "change"
    with _backup_lock:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        target = BACKUP_DIR / f"sheet-{stamp}-{safe_reason}.xlsx"
        shutil.copy2(EXCEL_FILE, target)
        snapshots = sorted(BACKUP_DIR.glob("sheet-*.xlsx"), key=lambda p: p.stat().st_mtime, reverse=True)
        for stale in snapshots[BACKUP_RETENTION:]:
            stale.unlink(missing_ok=True)
        return target


def save_workbook(workbook, reason: str = "change") -> None:
    workbook.save(EXCEL_FILE)
    create_backup(reason)


initialize_storage()
