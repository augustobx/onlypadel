import 'server-only';

import { platformPrisma } from '@/lib/prisma-core';

function effectiveExpiry(subscription: {
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
} | null | undefined) {
  if (!subscription) return null;
  if (subscription.status === 'TRIAL') return subscription.trialEndsAt;
  return subscription.currentPeriodEnd;
}

export async function syncTenantMembership(tenantId: string) {
  const tenant = await platformPrisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!tenant) return null;
  const subscription = tenant.subscriptions[0] || null;
  const expiresAt = effectiveExpiry(subscription);

  if (tenant.status === 'ACTIVE' && expiresAt && expiresAt.getTime() < Date.now()) {
    await platformPrisma.$transaction([
      platformPrisma.tenant.update({ where: { id: tenant.id }, data: { status: 'SUSPENDED' } }),
      ...(subscription
        ? [platformPrisma.tenantSubscription.update({ where: { id: subscription.id }, data: { status: 'SUSPENDED' } })]
        : []),
    ]);
    return { ...tenant, status: 'SUSPENDED' as const };
  }

  return tenant;
}

export async function suspendExpiredTenants() {
  const candidates = await platformPrisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  let suspended = 0;
  for (const tenant of candidates) {
    const updated = await syncTenantMembership(tenant.id);
    if (updated?.status === 'SUSPENDED') suspended += 1;
  }
  return suspended;
}
