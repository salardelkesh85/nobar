#!/bin/sh
# PostgreSQL dumps for the compose stack (runs in the `backup` service).
#   sh /backup.sh        every 24 hours (the service's default)
#   sh /backup.sh once   one dump now, e.g. before an update:  docker compose exec backup sh /backup.sh once
# Restore into an empty database: gunzip -c backups/nobar-<time>.sql.gz | docker compose exec -T db psql -U nobar -d nobar
set -u
# connection from PGHOST / PGPASSWORD (set by the compose service)
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# wait for the API's first migration, so the first dump is not an empty database
wait_for_schema() {
  i=0
  until psql -U nobar -d nobar -tAc "select 1 from _migrations limit 1" 2>/dev/null | grep -q 1; do
    i=$((i + 1))
    if [ "$i" -ge 120 ]; then
      echo "backup: no schema after 10 minutes; dumping anyway" >&2
      return
    fi
    sleep 5
  done
}

dump() {
  file="/backups/nobar-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  # dump to a file first and compress only a complete dump: a failed pg_dump must never leave an empty "backup"
  if pg_dump -U nobar -d nobar --no-owner -f "$file.sql.tmp" && gzip -c "$file.sql.tmp" > "$file.tmp"; then
    rm -f "$file.sql.tmp"
    mv "$file.tmp" "$file"
    echo "backup written: $file ($(wc -c < "$file") bytes)"
  else
    rm -f "$file.sql.tmp" "$file.tmp"
    echo "backup FAILED" >&2
    return 1
  fi
}

wait_for_schema
if [ "${1:-}" = "once" ]; then
  dump
  exit $?
fi
while true; do
  dump || true
  # prune old dumps (only files this script writes)
  find /backups -maxdepth 1 -name 'nobar-*.sql.gz' -mtime "+$KEEP_DAYS" -exec rm -f {} \;
  sleep 86400
done
