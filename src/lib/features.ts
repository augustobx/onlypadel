import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const FEATURE_KEYS = [
  'reservations', 'users', 'tournaments', 'rankings', 'player_categories',
  'expenses', 'whatsapp', 'push', 'payments',
] as const;
export type FeatureKey = typeof FEATURE_KEYS[number];

const cache = new Map<string, { expiresAt: number; enabled: boolean }>();

export async function hasTenantFeature(key: FeatureKey) {
  const tenant = await resolveTenantContext();
  const cacheKey = `${tenant.id}:${key}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.enabled;

  const now = new Date();
  const [override, subscription] = await Promise.all([
    platformPrisma.tenantFeatureOverride.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key } },
    }),
    platformPrisma.tenantSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ['TRIAL', 'ACTIVE'] },
        OR: [
          { status: 'ACTIVE', currentPeriodEnd: null },
          { status: 'ACTIVE', currentPeriodEnd: { gt: now } },
          { status: 'TRIAL', trialEndsAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: { include: { features: { where: { key } } } } },
    }),
  ]);

  const enabled = override?.enabled ?? subscription?.plan.features[0]?.enabled ?? false;
  cache.set(cacheKey, { enabled, expiresAt: Date.now() + 5_000 });
  return enabled;
}

export async function requireTenantFeature(key: FeatureKey) {
  if (!(await hasTenantFeature(key))) throw new Error(`FEATURE_DISABLED:${key}`);
}

export function clearFeatureCache() {
  cache.clear();
}
