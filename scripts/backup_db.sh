#!/usr/bin/env sh
# Consistent PostgreSQL backup of the production stack, with rotation.
#
#   scripts/backup_db.sh [backup-dir] [retention-days]
#
# Schedule it daily from the host's cron, e.g.:
#   15 2 * * * cd /opt/citymind && scripts/backup_db.sh /var/backups/citymind 14
# Restore into an empty database with:
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" citymind-<stamp>.dump
# Copy backups off the server as well; a backup on the same disk is not a backup.
set -eu

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${2:-14}"
ENV_FILE="${ENV_FILE:-.env.production}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/citymind-$STAMP.dump"

# pg_dump runs inside the db container, so no database port is ever published.
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$TARGET.partial"

# Only a complete dump replaces the partial file, so an interrupted run never looks
# like a valid backup.
mv "$TARGET.partial" "$TARGET"
chmod 600 "$TARGET"

find "$BACKUP_DIR" -name 'citymind-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Backup written to $TARGET"
