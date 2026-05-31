#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: scripts/mongo-restore.sh backups/worldcup-YYYYMMDD-HHMMSS.archive.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${MONGO_DATABASE:?MONGO_DATABASE is required}"
: "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME is required}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is required}"

case "$BACKUP_FILE" in
  backups/*) ;;
  *)
    echo "Backup file must be inside ./backups so the Mongo container can read it."
    exit 1
    ;;
esac

CONTAINER_BACKUP="/backups/$(basename "$BACKUP_FILE")"

echo "This will drop and restore database: $MONGO_DATABASE"
printf "Type RESTORE to continue: "
read CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T mongo mongorestore \
  --host 127.0.0.1 \
  --port 27017 \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "$MONGO_DATABASE" \
  --archive="$CONTAINER_BACKUP" \
  --gzip \
  --drop

echo "Restore completed from: $BACKUP_FILE"
