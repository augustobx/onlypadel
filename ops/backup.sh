#!/bin/sh
set -eu

backup_dir="${ONLYPADEL_BACKUP_DIR:-/srv/backups/onlypadel}"
case "$backup_dir" in
  /srv/backups/onlypadel|/srv/backups/onlypadel/*) ;;
  *) echo "Unsafe backup directory" >&2; exit 1 ;;
esac

mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/onlypadel-${timestamp}.sql.gz"

docker compose exec -T db sh -c 'mariadb-dump --single-transaction --routines --triggers -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' | gzip -9 > "$target"
gzip -t "$target"
sha256sum "$target" > "$target.sha256"
find "$backup_dir" -maxdepth 1 -type f -name 'onlypadel-*.sql.gz*' -mtime +30 -delete
echo "$target"
