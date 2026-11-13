#!/bin/sh
# Nightly PostgreSQL dump for the compose stack (runs in the `backup` service).
# Restore: gunzip -c backups/nobar-<time>.sql.gz | docker compose exec -T db psql -U nobar -d nobar
set -u
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
while true; do
  file="/backups/nobar-$(date -u +%Y%m%dT%H%MZ).sql.gz"
  if pg_dump -h db -U nobar -d nobar --no-owner | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "backup written: $file"
  else
    echo "backup FAILED" >&2
  fi
  # prune old dumps (only files this script writes)
  find /backups -maxdepth 1 -name 'nobar-*.sql.gz' -mtime "+$KEEP_DAYS" -exec rm -f {} \;
  sleep 86400
done
