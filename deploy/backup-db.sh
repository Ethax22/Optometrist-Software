#!/usr/bin/env bash
# Nightly Postgres backup. Dumps the DB, compresses it, keeps the last 30
# days locally, and (optionally) syncs to off-box storage.
#
# One-time setup:
#   sudo mkdir -p /var/backups/optometrist-db
#   sudo chown $USER /var/backups/optometrist-db
#   crontab -e
#     0 2 * * * DATABASE_URL='postgres://...' /path/to/repo/deploy/backup-db.sh >> /var/log/optometrist-backup.log 2>&1
#
# DATABASE_URL must be set in the environment this runs in (cron does not
# read your shell's .env, so pass it explicitly in the crontab line above,
# or `source` the repo's .env before calling this script).
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/optometrist-db}"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping database to $FILE"
pg_dump "$DATABASE_URL" | gzip > "$FILE"

echo "==> Pruning backups older than 30 days"
find "$BACKUP_DIR" -name 'backup-*.sql.gz' -mtime +30 -delete

# Optional: sync off-box, e.g. to S3/Backblaze B2 with rclone.
# Uncomment and configure an rclone remote first (`rclone config`).
# echo "==> Syncing to off-box storage"
# rclone copy "$FILE" remote:optometrist-backups/

echo "==> Backup complete: $FILE"
