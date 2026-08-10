#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env.production" ]]; then
  ENV_FILE="${ENV_FILE:-.env.production}"
else
  ENV_FILE="${ENV_FILE:-.env.docker}"
fi

BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

ENV_FILE="$ENV_FILE" BACKUP_ROOT="$BACKUP_ROOT" bash "$ROOT_DIR/scripts/backup.sh"

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || (( BACKUP_RETENTION_DAYS < 1 )); then
  echo "Некорректный BACKUP_RETENTION_DAYS: $BACKUP_RETENTION_DAYS" >&2
  exit 1
fi

echo "Удаляем резервные копии старше ${BACKUP_RETENTION_DAYS} дней..."

find "$BACKUP_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  -name '20??-??-??_??-??-??' \
  -mtime "+$BACKUP_RETENTION_DAYS" \
  -print \
  -exec rm -rf -- {} +

echo "Ежедневное резервное копирование завершено успешно."
