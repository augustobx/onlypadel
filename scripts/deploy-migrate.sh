#!/bin/sh
set -eu

npx prisma migrate deploy
node scripts/bootstrap-platform.mjs
