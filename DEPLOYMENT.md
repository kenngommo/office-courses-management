# Production data, migrations, and backups

Neon is the source of truth in production. The workbook bundled in the Git
repository is only a local-development seed and must never overwrite an
existing online workbook during a deployment.

Render must define:

```
DATABASE_URL=<Neon pooled connection string>
BACKUP_RETENTION=30
```

On startup the application always downloads the existing online workbook. If
the online workbook is missing, startup fails instead of importing the bundled
file. `ALLOW_REMOTE_SEED=true` is allowed only for an intentional first import
or an explicitly approved recovery operation, and must be removed afterwards.

Every successful data-changing API request publishes a new workbook version
and retains the previous version in `workbook_backups`. A request may publish
only when the online SHA still matches the version it read. Concurrent changes
return HTTP 409 rather than overwriting newer data.

## Deployment rule

1. Deploy application code without replacing production data.
2. For schema changes, prepare and test an idempotent migration on a temporary
   Neon branch.
3. Back up/verify the current production version and obtain approval.
4. Apply only the reviewed migration to the main Neon branch.
5. Verify `/api/system/storage`, record counts, IDs, and relationships after
   deployment. Never delete/recreate the database as part of a normal deploy.

Run the read-only production audit after every deployment:

```
python scripts/audit_online_data.py
```

Use `GET /api/system/storage` to verify the active data location and backup
count after deployment.

## Safe course synchronization

Compare local course data with production without writing anything:

```
python scripts/sync_courses.py
```

Apply only Active/Unactive and duration differences:

```
python scripts/sync_courses.py --apply
```

The command refuses to add or delete modules automatically when identities
differ, protecting employee progress from an accidental catalog replacement.
