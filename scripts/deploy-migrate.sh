#!/bin/sh
set -eu

db_host="${DB_HOST:-db}"
baseline="20260901110000_baseline_legacy"

legacy_exists="$(mariadb -h "$db_host" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='booking'")"
history_exists="$(mariadb -h "$db_host" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='_prisma_migrations'")"
baseline_applied=0

if [ "$history_exists" = "1" ]; then
  baseline_applied="$(mariadb -h "$db_host" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -Nse "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='${baseline}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL")"
fi

if [ "$legacy_exists" = "1" ] && [ "$baseline_applied" = "0" ]; then
  npx prisma migrate resolve --applied "$baseline"
fi

npx prisma migrate deploy
node scripts/bootstrap-platform.mjs
