#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${1:-${BACKUP_DIR}/worldcup-${TIMESTAMP}.archive.gz}"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${MONGO_DATABASE:?MONGO_DATABASE is required}"
: "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME is required}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is required}"

mkdir -p "$BACKUP_DIR"

CONTAINER_BACKUP="/backups/$(basename "$BACKUP_FILE")"

docker compose -f "$COMPOSE_FILE" exec -T mongo mongodump \
  --host 127.0.0.1 \
  --port 27017 \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "$MONGO_DATABASE" \
  --archive="$CONTAINER_BACKUP" \
  --gzip

echo "Backup created: ${BACKUP_DIR}/$(basename "$BACKUP_FILE")"
