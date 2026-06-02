#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-backups}"
MONGO_TOOLS_IMAGE="${MONGO_TOOLS_IMAGE:-mongo:7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${1:-${BACKUP_DIR}/worldcup-${TIMESTAMP}.archive.gz}"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${MONGODB_URI:?MONGODB_URI is required}"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "$(pwd)/${BACKUP_DIR}:/backups" \
  "$MONGO_TOOLS_IMAGE" \
  mongodump \
  --uri "$MONGODB_URI" \
  --archive="/backups/$(basename "$BACKUP_FILE")" \
  --gzip

echo "Backup created: ${BACKUP_DIR}/$(basename "$BACKUP_FILE")"
