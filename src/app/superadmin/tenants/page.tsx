import { redirect } from 'next/navigation';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';
import { suspendExpiredTenants } from '@/lib/membership';
import { TenantsManagerClient } from './tenants-client';

export default async function TenantsPage() {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  await suspendExpiredTenants();

  const [tenantsRaw, plansRaw] = await Promise.all([
    platformPrisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        domains: true,
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } },
        _count: { select: { users: true, courts: true, bookings: true } },
      },
    }),
    platformPrisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
  ]);

  const tenants = tenantsRaw.map(t => {
    const sub = t.subscriptions[0];
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      host: t.domains.find(d => d.isPrimary)?.hostname || `${t.slug}.nanoapps.ar`,
      planName: sub?.plan.name || null,
      planPrice: sub ? Number(sub.plan.price) : 0,
      users: t._count.users,
      courts: t._count.courts,
      bookings: t._count.bookings,
    };
  });

  const plans = plansRaw.map(p => ({ id: p.id, name: p.name, price: Number(p.price) }));
  return <TenantsManagerClient tenants={tenants} plans={plans} />;
}
