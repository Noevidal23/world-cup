#!/bin/sh
set -eu

MONGO_TOOLS_IMAGE="${MONGO_TOOLS_IMAGE:-mongo:7}"
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

: "${MONGODB_URI:?MONGODB_URI is required}"

case "$BACKUP_FILE" in
  backups/*) ;;
  *)
    echo "Backup file must be inside ./backups."
    exit 1
    ;;
esac

echo "This will drop and restore the database configured in MONGODB_URI."
printf "Type RESTORE to continue: "
read CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker run --rm -i \
  -v "$(pwd)/backups:/backups" \
  "$MONGO_TOOLS_IMAGE" \
  mongorestore \
  --uri "$MONGODB_URI" \
  --archive="/backups/$(basename "$BACKUP_FILE")" \
  --gzip \
  --drop

echo "Restore completed from: $BACKUP_FILE"
