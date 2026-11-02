#!/usr/bin/env bash
# Nightly backup: database dump (14 days kept) + a mirror of the photo folder.
# For real safety copy /var/backups/celinebaby off the server too (see deploy/README.md).
set -euo pipefail
DIR=/var/backups/celinebaby
STAMP="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DIR/db" "$DIR/media"
pg_dump --no-owner --format=custom "$DATABASE_URL" > "$DIR/db/celinebaby_$STAMP.dump"
find "$DIR/db" -name '*.dump' -mtime +14 -delete
rsync -a --delete "$MEDIA_DIR/" "$DIR/media/"
echo "backup ok: $DIR/db/celinebaby_$STAMP.dump"
