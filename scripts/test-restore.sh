#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
RESTORE_DATABASE="exam_platform_restore_test"
RESTORE_FILES_DIR="$ROOT_DIR/.restore-test"

BACKUP_DIR="${1:-}"

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="$(
    find "$BACKUP_ROOT" \
      -mindepth 1 \
      -maxdepth 1 \
      -type d \
      -print |
      sort |
      tail -n 1
  )"
fi

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Папка резервной копии не найдена" >&2
  exit 1
fi

DATABASE_DUMP="$BACKUP_DIR/database.dump"
UPLOADS_ARCHIVE="$BACKUP_DIR/uploads.tar.gz"
TASK_FILES_ARCHIVE="$BACKUP_DIR/task-files.tar.gz"

if [[ ! -s "$DATABASE_DUMP" ]]; then
  echo "Не найден дамп базы: $DATABASE_DUMP" >&2
  exit 1
fi

if [[ ! -s "$UPLOADS_ARCHIVE" ]]; then
  echo "Не найден архив uploads: $UPLOADS_ARCHIVE" >&2
  exit 1
fi

if [[ ! -s "$TASK_FILES_ARCHIVE" ]]; then
  echo "Не найден архив файлов заданий: $TASK_FILES_ARCHIVE" >&2
  exit 1
fi

echo "Проверяем архив базы..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T db \
  pg_restore --list \
  < "$DATABASE_DUMP" \
  > /dev/null

echo "Пересоздаём тестовую базу..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T db \
  sh -lc "
    dropdb \
      --if-exists \
      -U \"\$POSTGRES_USER\" \
      \"$RESTORE_DATABASE\"

    createdb \
      -U \"\$POSTGRES_USER\" \
      \"$RESTORE_DATABASE\"
  "

echo "Восстанавливаем PostgreSQL..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T db \
  sh -lc "
    pg_restore \
      --exit-on-error \
      --no-owner \
      --no-privileges \
      -U \"\$POSTGRES_USER\" \
      -d \"$RESTORE_DATABASE\"
  " \
  < "$DATABASE_DUMP"

echo "Проверяем таблицы и пользователей..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T db \
  sh -lc "
    psql \
      -U \"\$POSTGRES_USER\" \
      -d \"$RESTORE_DATABASE\" \
      -c 'SELECT email, role FROM \"User\";'
  "

echo "Проверяем восстановление uploads..."

rm -rf "$RESTORE_FILES_DIR"
mkdir -p "$RESTORE_FILES_DIR"

tar \
  -xzf "$UPLOADS_ARCHIVE" \
  -C "$RESTORE_FILES_DIR"

tar \
  -xzf "$TASK_FILES_ARCHIVE" \
  -C "$RESTORE_FILES_DIR"

if [[ ! -d "$RESTORE_FILES_DIR/uploads" ]]; then
  echo "Архив uploads восстановился некорректно" >&2
  exit 1
fi

if [[ ! -d "$RESTORE_FILES_DIR/task-files" ]]; then
  echo "Архив файлов заданий восстановился некорректно" >&2
  exit 1
fi

RESTORED_FILE_COUNT="$(
  find "$RESTORE_FILES_DIR/uploads" -type f | wc -l | tr -d " "
)"

RESTORED_TASK_FILE_COUNT="$(
  find "$RESTORE_FILES_DIR/task-files" -type f | wc -l | tr -d " "
)"

echo ""
echo "Тест восстановления выполнен успешно."
echo "Резервная копия: $BACKUP_DIR"
echo "Тестовая база: $RESTORE_DATABASE"
echo "Файлов в uploads: $RESTORED_FILE_COUNT"
echo "Вложений заданий: $RESTORED_TASK_FILE_COUNT"
