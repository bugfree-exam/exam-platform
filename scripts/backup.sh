#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не найден env-файл: $ENV_FILE" >&2
  exit 1
fi

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"
mkdir -p "$ROOT_DIR/storage/uploads"

echo "Создаём дамп PostgreSQL..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T db \
  sh -lc 'pg_dump \
    --format=custom \
    --no-owner \
    --no-privileges \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/database.dump"

if [[ ! -s "$BACKUP_DIR/database.dump" ]]; then
  echo "Ошибка: дамп базы получился пустым" >&2
  exit 1
fi

echo "Архивируем uploads..."

tar \
  -C "$ROOT_DIR/storage" \
  -czf "$BACKUP_DIR/uploads.tar.gz" \
  uploads

cat > "$BACKUP_DIR/manifest.txt" <<EOF
created_at=$TIMESTAMP
database_file=database.dump
uploads_file=uploads.tar.gz
EOF

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$BACKUP_DIR"
    sha256sum database.dump uploads.tar.gz > SHA256SUMS
  )
elif command -v shasum >/dev/null 2>&1; then
  (
    cd "$BACKUP_DIR"
    shasum -a 256 database.dump uploads.tar.gz > SHA256SUMS
  )
fi

echo ""
echo "Резервная копия создана:"
echo "$BACKUP_DIR"
echo ""
du -h "$BACKUP_DIR/database.dump" "$BACKUP_DIR/uploads.tar.gz"