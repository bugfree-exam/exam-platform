#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env.production" ]]; then
  ENV_FILE="${ENV_FILE:-.env.production}"
else
  ENV_FILE="${ENV_FILE:-.env.docker}"
fi

COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-80}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-36}"

failures=0

fail() {
  echo "ERROR: $*" >&2
  failures=$((failures + 1))
}

echo "== Docker services =="
for service in db app; do
  if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status running --services | grep -qx "$service"; then
    fail "service '$service' is not running"
  else
    echo "OK: $service"
  fi
done

echo "== Application health =="
if curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/api/health >/dev/null; then
  echo "OK: /api/health"
else
  fail "/api/health failed"
fi

echo "== Disk usage =="
disk_percent="$(df -P "$ROOT_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [[ -z "$disk_percent" || ! "$disk_percent" =~ ^[0-9]+$ ]]; then
  fail "could not determine disk usage"
elif (( disk_percent >= DISK_WARN_PERCENT )); then
  fail "disk usage is ${disk_percent}% (threshold ${DISK_WARN_PERCENT}%)"
else
  echo "OK: disk ${disk_percent}%"
fi

echo "== Latest backup =="
latest_backup="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -print 2>/dev/null | sort | tail -n 1 || true)"
if [[ -z "$latest_backup" ]]; then
  fail "no backup found"
else
  now_epoch="$(date +%s)"
  backup_epoch="$(stat -c %Y "$latest_backup")"
  backup_age_hours=$(( (now_epoch - backup_epoch) / 3600 ))
  if (( backup_age_hours > BACKUP_MAX_AGE_HOURS )); then
    fail "latest backup is ${backup_age_hours}h old (maximum ${BACKUP_MAX_AGE_HOURS}h)"
  else
    echo "OK: latest backup ${backup_age_hours}h old"
  fi
fi

echo "== Docker disk usage =="
docker system df || true

if (( failures > 0 )); then
  echo "Maintenance check failed: $failures problem(s)." >&2
  exit 1
fi

echo "Maintenance check completed successfully."
