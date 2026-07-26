#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="compose.production.yml"
ENV_FILE=".env.docker"

echo "Пересобираем локальную production-версию..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --build

echo ""
echo "Ждём запуска приложения..."
sleep 15

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  ps -a

echo ""
echo "Проверяем healthcheck..."

curl --fail --silent --show-error \
  http://127.0.0.1:3000/api/health

echo ""
echo ""
echo "Готово: http://localhost:3000"