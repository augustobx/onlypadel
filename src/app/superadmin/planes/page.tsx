import { redirect } from 'next/navigation';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';
import { PlanesClient } from './planes-client';

function readLimits(value: unknown) {
  const limits = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { users: Number(limits.users || 0), courts: Number(limits.courts || 0), bookings: Number(limits.bookings || 0) };
}

export default async function PlanesPage() {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  const raw = await platformPrisma.plan.findMany({ orderBy: { price: 'asc' }, include: { features: true, _count: { select: { subscriptions: true } } } });
  const plans = raw.map(p => ({ id:p.id, code:p.code, name:p.name, description:p.description, price:Number(p.price), currency:p.currency, limits:readLimits(p.limits), isActive:p.isActive, isPublic:p.isPublic, features:p.features.filter(f=>f.enabled).map(f=>f.key), subscriptions:p._count.subscriptions }));
  return <PlanesClient plans={plans} />;
}
