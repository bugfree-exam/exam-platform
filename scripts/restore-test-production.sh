#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env.production" ]]; then
  ENV_FILE="${ENV_FILE:-.env.production}"
else
  ENV_FILE="${ENV_FILE:-.env.docker}"
fi

ENV_FILE="$ENV_FILE" bash "$ROOT_DIR/scripts/test-restore.sh"
