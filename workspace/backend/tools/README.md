# Atlas -> Local MongoDB — Safe Copy (Instructions)

This folder contains a small PowerShell helper to safely copy a database from MongoDB Atlas to your local MongoDB instance without affecting existing data.

Files:
- `atlas_to_local.ps1` — Interactive PowerShell script that dumps a single Atlas database and restores it into a new local database (default name: `<source>_atlas_copy_<timestamp>`). It does not drop or overwrite existing DBs.

Prerequisites:
- Local MongoDB server running on `localhost:27017` (or adjust the script).
- MongoDB Database Tools (provides `mongodump` and `mongorestore`): https://www.mongodb.com/docs/database-tools/installation/
- Preferably, an Atlas user with read-only permissions for the source database.

How it works (safety-first):
1. The script runs `mongodump` against your Atlas connection string to create a compressed archive file (in `%TEMP%`).
2. It runs `mongorestore` against your local MongoDB, remapping the namespace so the Atlas DB name becomes a new local DB name. No `--drop` is used, so existing local databases/collections are preserved.

Quick usage (PowerShell / pwsh):

```powershell
# From the repo root (Windows PowerShell / pwsh):
pwsh -NoProfile -ExecutionPolicy Bypass -File .\workspace\backend\tools\atlas_to_local.ps1
```

You'll be prompted for:
- Atlas connection string (e.g., `mongodb+srv://user:pass@cluster0.xyz.mongodb.net`)
- Source database name (the DB on Atlas to copy)
- Local target DB name (optional — default is `<source>_atlas_copy_<timestamp>`)

After successful run:
- The script prints the local DB name. To run the backend temporarily using that DB without editing project files, in the same PowerShell session set:

```powershell
$env:DATABASE_URL = "mongodb://localhost:27017/<target_db_name>"
npm run dev
```

This only affects the current terminal session and does not modify any project configuration files.

Safety reminders:
- Do NOT replace or commit production environment variables in the repo.
- If you want to permanently develop against the local DB, create a local `.env` (ignored by git) and set `DATABASE_URL` there. But for quick testing prefer the temporary env var approach.
- Always prefer a read-only Atlas user for dumps.

If you want, I can also add a Node script that selectively copies a few collections, or create a variant that restores into an existing DB with collection renames. Tell me which you'd prefer.