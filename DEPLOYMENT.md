# Data persistence and backups

The application writes its live workbook to `DATA_DIR/sheet.xlsx`. If
`DATA_DIR` is not set, it keeps the original local behavior and uses the
project root.

For Render, attach a Persistent Disk mounted at `/var/data` and set:

```
DATA_DIR=/var/data
BACKUP_RETENTION=30
```

Every successful POST, PUT, PATCH, or DELETE API request creates a timestamped
snapshot in `DATA_DIR/backups`. Old snapshots are automatically pruned. The
first start on an empty disk copies the repository's `sheet.xlsx` into the
persistent directory.

Use `GET /api/system/storage` to verify the active data location and backup
count after deployment.
