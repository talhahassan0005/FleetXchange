# Safe Atlas -> Local MongoDB copy script (PowerShell)
# Usage: Run in PowerShell (pwsh) and provide Atlas URI and source DB name when prompted.
# This script will create a new local database (default name: <source>_atlas_copy_<timestamp>) and
# restore Atlas data into that database. It will NOT drop or overwrite existing local DBs.

param()

Write-Host "=== Atlas -> Local MongoDB Safe Copy Script ==="

$atlasUri = Read-Host "Enter MongoDB Atlas connection string (mongodb+srv://... or mongodb://... ). Use a read-only user if possible"
if ([string]::IsNullOrWhiteSpace($atlasUri)) {
    Write-Error "Atlas URI is required. Exiting."
    exit 1
}

$sourceDb = Read-Host "Enter source database name on Atlas (e.g., fleetxchange)"
if ([string]::IsNullOrWhiteSpace($sourceDb)) {
    Write-Error "Source database name is required. Exiting."
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$defaultTarget = "${sourceDb}_atlas_copy_$timestamp"
$targetDb = Read-Host "Enter desired local target DB name (leave empty for default: $defaultTarget)"
if ([string]::IsNullOrWhiteSpace($targetDb)) { $targetDb = $defaultTarget }

# Prepare archive path
$archive = Join-Path $env:TEMP "$($sourceDb)-$timestamp.archive.gz"

# Check for required tools
if (-not (Get-Command mongodump -ErrorAction SilentlyContinue)) {
    Write-Error "mongodump not found in PATH. Please install MongoDB Database Tools: https://www.mongodb.com/docs/database-tools/installation/"
    exit 1
}
if (-not (Get-Command mongorestore -ErrorAction SilentlyContinue)) {
    Write-Error "mongorestore not found in PATH. Please install MongoDB Database Tools: https://www.mongodb.com/docs/database-tools/installation/"
    exit 1
}

Write-Host "Dumping Atlas database '$sourceDb' to archive: $archive"

$dumpCmd = @(
    'mongodump',
    "--uri=$atlasUri",
    "--db=$sourceDb",
    "--archive=$archive",
    '--gzip'
) -join ' '

Write-Host "Running: $dumpCmd"
$dumpProc = Start-Process -FilePath mongodump -ArgumentList "--uri=$atlasUri","--db=$sourceDb","--archive=$archive","--gzip" -NoNewWindow -Wait -PassThru
if ($dumpProc.ExitCode -ne 0) {
    Write-Error "mongodump failed with exit code $($dumpProc.ExitCode). Aborting."
    exit 1
}

Write-Host "Dump completed successfully. Archive: $archive"

# Restore to local with namespace remapping so we don't overwrite any existing DB
$localUri = "mongodb://localhost:27017"

Write-Host "Restoring into local MongoDB at $localUri as database '$targetDb' (no existing DBs will be dropped or overwritten)."

$restoreArgs = @("--uri=$localUri","--nsFrom=$($sourceDb).*","--nsTo=$($targetDb).*","--archive=$archive","--gzip","--noIndexRestore")
Write-Host "Running mongorestore with namespace remap: $($restoreArgs -join ' ')"

$restoreProc = Start-Process -FilePath mongorestore -ArgumentList $restoreArgs -NoNewWindow -Wait -PassThru
if ($restoreProc.ExitCode -ne 0) {
    Write-Error "mongorestore failed with exit code $($restoreProc.ExitCode). Aborting."
    exit 1
}

Write-Host "Restore completed successfully. Local DB name: $targetDb"

Write-Host "\nNext steps (safe, non-destructive):"
Write-Host "1) Start local MongoDB if not running."
Write-Host "2) To run the backend temporarily against this local DB without changing project files, open a PowerShell terminal and run:"
Write-Host "   $env:DATABASE_URL = 'mongodb://localhost:27017/$targetDb' ; npm run dev"
Write-Host "   (This sets the environment variable only for the current terminal session.)"

Write-Host "3) When finished, you can remove the temporary archive file: $archive"
Write-Host "\nImportant safety notes:"
Write-Host "- This script remaps the source DB to a new local DB name ($targetDb). It does NOT use --drop, so it will not delete or overwrite existing local collections."
Write-Host "- Prefer creating a read-only Atlas user for dumping, not using a full admin user."
Write-Host "- Review the Atlas URI carefully before running."

Write-Host "All done."
