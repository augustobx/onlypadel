FROM node:22-alpine AS base

# =========================
# 1. Dependencias
# =========================
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# =========================
# 2. Build
# =========================
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_VAPID_SUBJECT
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_VAPID_SUBJECT=$NEXT_PUBLIC_VAPID_SUBJECT \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate \
    && npm run build

# =========================
# 3. Migraciones versionadas
# =========================
FROM base AS migrator
RUN apk add --no-cache mariadb-client openssl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts/bootstrap-platform.mjs ./scripts/bootstrap-platform.mjs
COPY --from=builder /app/scripts/deploy-migrate.sh ./scripts/deploy-migrate.sh
COPY --from=builder /app/package.json ./package.json
RUN chmod +x /app/scripts/deploy-migrate.sh
USER node
CMD ["sh", "/app/scripts/deploy-migrate.sh"]

# =========================
# 4. Producción
# =========================
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/.next \
    && chown nextjs:nodejs /app/.next

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
