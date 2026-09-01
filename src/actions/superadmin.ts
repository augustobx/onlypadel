'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { clearFeatureCache, FEATURE_KEYS } from '@/lib/features';
import { clearPlatformSession, requirePlatformAdmin } from '@/lib/platform-auth';
import { clearTenantResolutionCache, normalizeHostname } from '@/lib/tenant-context';

const refresh = () => {
  revalidatePath('/superadmin');
  revalidatePath('/superadmin/tenants');
  revalidatePath('/superadmin/planes');
};

export async function superAdminLogout() {
  await clearPlatformSession();
  redirect('/superadmin/login');
}

export async function createTenantSuperAdmin(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const name = z.string().trim().min(2).max(160).parse(formData.get('name'));
  const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).parse(formData.get('slug'));
  const planId = z.string().uuid().parse(formData.get('planId'));
  const ownerName = z.string().trim().min(2).max(160).parse(formData.get('ownerName'));
  const ownerEmail = z.email().parse(formData.get('ownerEmail')).toLowerCase();
  const ownerPassword = z.string().min(10).max(128).parse(formData.get('ownerPassword'));
  const startsAtRaw = String(formData.get('startsAt') || '');
  const expiresAtRaw = String(formData.get('expiresAt') || '');
  const startsAt = startsAtRaw ? new Date(`${startsAtRaw}T12:00:00`) : new Date();
  const expiresAt = expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59`) : null;
  const reserved = (process.env.PLATFORM_HOST || 'onlypadel.nanoapps.ar').split('.')[0].toLowerCase();
  if (slug === reserved) throw new Error('Ese subdominio está reservado para la plataforma.');
  const hostname = normalizeHostname(`${slug}.${process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar'}`);
  const password = await bcrypt.hash(ownerPassword, 12);

  await platformPrisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name, slug, status: 'ACTIVE' } });
    await tx.tenantDomain.create({ data: { tenantId: tenant.id, hostname, isPrimary: true, verifiedAt: new Date() } });
    await tx.tenantSubscription.create({
      data: { tenantId: tenant.id, planId, status: 'ACTIVE', startsAt, currentPeriodStart: startsAt, currentPeriodEnd: expiresAt },
    });
    await tx.systemSetting.create({
      data: { tenantId: tenant.id, clubName: name, topbarName: name, splashLogo: name, splashName: name, adminUser: '', adminPass: '' },
    });
    const owner = await tx.user.create({
      data: { tenantId: tenant.id, name: ownerName, email: ownerEmail, password, role: 'ADMIN', isActive: true },
    });
    await tx.platformAuditLog.create({
      data: { actorId: actor.userId, tenantId: tenant.id, action: 'TENANT_CREATED', entityType: 'Tenant', entityId: tenant.id, metadata: { hostname, ownerId: owner.id } },
    });
  });

  clearTenantResolutionCache();
  clearFeatureCache();
  refresh();
}

export async function updateTenantSuperAdmin(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const tenantId = z.string().uuid().parse(formData.get('tenantId'));
  const name = z.string().trim().min(2).max(160).parse(formData.get('name'));
  const status = z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).parse(formData.get('status'));
  const planId = z.string().uuid().parse(formData.get('planId'));
  const startsAtRaw = String(formData.get('startsAt') || '');
  const expiresAtRaw = String(formData.get('expiresAt') || '');
  const startsAt = startsAtRaw ? new Date(`${startsAtRaw}T12:00:00`) : new Date();
  const expiresAt = expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59`) : null;

  await platformPrisma.$transaction(async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { name, status, archivedAt: status === 'ARCHIVED' ? new Date() : null } });
    const current = await tx.tenantSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    if (current?.planId === planId) {
      await tx.tenantSubscription.update({
        where: { id: current.id },
        data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED', startsAt, currentPeriodStart: startsAt, currentPeriodEnd: expiresAt },
      });
    } else {
      if (current) await tx.tenantSubscription.update({ where: { id: current.id }, data: { status: 'CANCELED', canceledAt: new Date() } });
      await tx.tenantSubscription.create({
        data: { tenantId, planId, status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED', startsAt, currentPeriodStart: startsAt, currentPeriodEnd: expiresAt },
      });
    }
    await tx.platformAuditLog.create({
      data: { actorId: actor.userId, tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenantId, metadata: { status, planId, expiresAt } },
    });
    if (status !== 'ACTIVE') {
      await tx.adminSession.updateMany({ where: { tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.userSession.updateMany({ where: { tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  });

  clearTenantResolutionCache();
  clearFeatureCache();
  refresh();
  revalidatePath(`/superadmin/tenants/${tenantId}`);
}

export async function savePlanSuperAdmin(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const planId = String(formData.get('planId') || '');
  const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]+$/).max(80).parse(formData.get('code'));
  const name = z.string().trim().min(2).max(160).parse(formData.get('name'));
  const description = String(formData.get('description') || '').trim() || null;
  const price = z.coerce.number().min(0).parse(formData.get('price'));
  const currency = z.string().trim().length(3).parse(formData.get('currency') || 'ARS').toUpperCase();
  const isActive = formData.get('isActive') === 'on';
  const isPublic = formData.get('isPublic') === 'on';
  const limits = {
    users: Math.max(0, Number(formData.get('limitUsers') || 0)),
    courts: Math.max(0, Number(formData.get('limitCourts') || 0)),
    bookings: Math.max(0, Number(formData.get('limitBookings') || 0)),
  };
  const enabledFeatures = FEATURE_KEYS.filter(key => formData.get(`feature:${key}`) === 'on');

  await platformPrisma.$transaction(async (tx) => {
    const plan = planId
      ? await tx.plan.update({ where: { id: z.string().uuid().parse(planId) }, data: { name, description, price, currency, limits, isActive, isPublic } })
      : await tx.plan.create({ data: { code, name, description, price, currency, limits, isActive, isPublic } });
    await tx.planFeature.deleteMany({ where: { planId: plan.id } });
    if (enabledFeatures.length) await tx.planFeature.createMany({ data: enabledFeatures.map(key => ({ planId: plan.id, key, enabled: true })) });
    await tx.platformAuditLog.create({ data: { actorId: actor.userId, action: 'PLAN_SAVED', entityType: 'Plan', entityId: plan.id, metadata: { code: plan.code } } });
  });

  clearFeatureCache();
  refresh();
}

export async function registerSaasPayment(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const tenantId = z.string().uuid().parse(formData.get('tenantId'));
  const amount = z.coerce.number().positive().parse(formData.get('amount'));
  const periodStartRaw = z.string().min(10).parse(formData.get('periodStart'));
  const periodEndRaw = z.string().min(10).parse(formData.get('periodEnd'));
  const periodStart = new Date(`${periodStartRaw}T12:00:00`);
  const periodEnd = new Date(`${periodEndRaw}T23:59:59`);
  const notes = String(formData.get('notes') || '').trim() || null;
  const subscription = await platformPrisma.tenantSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  if (!subscription) throw new Error('El tenant no tiene suscripción.');

  await platformPrisma.$transaction([
    platformPrisma.saasPayment.create({
      data: { tenantId, subscriptionId: subscription.id, amount, currency: 'ARS', status: 'PAID', provider: 'MANUAL', periodStart, periodEnd, paidAt: new Date(), notes },
    }),
    platformPrisma.tenantSubscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, canceledAt: null } }),
    platformPrisma.tenant.update({ where: { id: tenantId }, data: { status: 'ACTIVE', archivedAt: null } }),
    platformPrisma.platformAuditLog.create({ data: { actorId: actor.userId, tenantId, action: 'PAYMENT_REGISTERED', entityType: 'SaasPayment', metadata: { amount, periodStart, periodEnd } } }),
  ]);

  clearTenantResolutionCache();
  refresh();
  revalidatePath(`/superadmin/tenants/${tenantId}`);
}
