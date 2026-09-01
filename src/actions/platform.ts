'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { platformPrisma } from '@/lib/prisma-core';
import { clearPlatformSession, createPlatformSession, requirePlatformAdmin } from '@/lib/platform-auth';
import { clearFeatureCache, FEATURE_KEYS } from '@/lib/features';
import { clearTenantResolutionCache, normalizeHostname } from '@/lib/tenant-context';

const loginSchema = z.object({ email: z.email(), password: z.string().min(8) });
const tenantSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  planId: z.string().uuid(), ownerName: z.string().trim().min(2).max(160), ownerEmail: z.email(), ownerPassword: z.string().min(10).max(128),
});
const planSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]+$/).max(80), name: z.string().trim().min(2).max(160), price: z.coerce.number().min(0) });
const refresh = (tenantId?: string) => { revalidatePath('/platform'); revalidatePath('/superadmin'); revalidatePath('/superadmin/tenants'); revalidatePath('/superadmin/planes'); if (tenantId) revalidatePath(`/superadmin/tenants/${tenantId}`); };

export async function loginPlatform(formData: FormData) {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { success: false, error: 'Credenciales inválidas.' };
  const user = await platformPrisma.platformUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user?.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return { success: false, error: 'Credenciales inválidas.' };
  await createPlatformSession(user.id);
  redirect('/superadmin');
}

export async function logoutPlatform() { await clearPlatformSession(); redirect('/superadmin/login'); }

export async function createTenant(formData: FormData) {
  const actor = await requirePlatformAdmin(); const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Datos inválidos.');
  const data = parsed.data; const reserved = (process.env.PLATFORM_HOST || 'onlypadel.nanoapps.ar').toLowerCase().split('.')[0];
  if (data.slug === reserved) throw new Error('Ese subdominio está reservado para la plataforma.');
  const hostname = normalizeHostname(`${data.slug}.${process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar'}`); const password = await bcrypt.hash(data.ownerPassword, 12);
  await platformPrisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({ data: { name: data.name, slug: data.slug } });
    await tx.tenantDomain.create({ data: { tenantId: tenant.id, hostname, isPrimary: true, verifiedAt: new Date() } });
    await tx.tenantSubscription.create({ data: { tenantId: tenant.id, planId: data.planId, status: 'TRIAL', trialEndsAt: new Date(Date.now() + 14 * 86400_000) } });
    await tx.systemSetting.create({ data: { tenantId: tenant.id, clubName: data.name, topbarName: data.name, splashLogo: data.name, splashName: data.name, adminUser: '', adminPass: '' } });
    const owner = await tx.user.create({ data: { tenantId: tenant.id, name: data.ownerName, email: data.ownerEmail.toLowerCase(), password, role: 'ADMIN', isActive: true } });
    await tx.platformAuditLog.create({ data: { actorId: actor.userId, tenantId: tenant.id, action: 'TENANT_CREATED', entityType: 'Tenant', entityId: tenant.id, metadata: { hostname, ownerId: owner.id } } });
  }); clearTenantResolutionCache(); clearFeatureCache(); refresh();
}

export async function setTenantStatus(formData: FormData) {
  const actor = await requirePlatformAdmin(); const tenantId = z.string().uuid().parse(formData.get('tenantId')); const status = z.enum(['ACTIVE','SUSPENDED','ARCHIVED']).parse(formData.get('status'));
  await platformPrisma.$transaction([platformPrisma.tenant.update({ where: { id: tenantId }, data: { status, archivedAt: status === 'ARCHIVED' ? new Date() : null } }), platformPrisma.platformAuditLog.create({ data: { actorId: actor.userId, tenantId, action: `TENANT_${status}`, entityType: 'Tenant', entityId: tenantId } }), platformPrisma.adminSession.updateMany({ where: { tenantId, revokedAt: null }, data: { revokedAt: new Date() } }), platformPrisma.userSession.updateMany({ where: { tenantId, revokedAt: null }, data: { revokedAt: new Date() } })]); clearTenantResolutionCache(); refresh(tenantId);
}

export async function setTenantPlan(formData: FormData) {
  const actor = await requirePlatformAdmin(); const tenantId = z.string().uuid().parse(formData.get('tenantId')); const planId = z.string().uuid().parse(formData.get('planId')); const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth()+1);
  await platformPrisma.$transaction(async tx => { await tx.tenantSubscription.updateMany({ where: { tenantId, status: { in: ['TRIAL','ACTIVE'] } }, data: { status: 'CANCELED', canceledAt: new Date() } }); await tx.tenantSubscription.create({ data: { tenantId, planId, status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: periodEnd } }); await tx.platformAuditLog.create({ data: { actorId: actor.userId, tenantId, action: 'SUBSCRIPTION_CHANGED', entityType: 'Plan', entityId: planId } }); }); clearFeatureCache(); refresh(tenantId);
}

export async function setFeatureOverride(formData: FormData) {
  const actor = await requirePlatformAdmin(); const tenantId = z.string().uuid().parse(formData.get('tenantId')); const key = z.enum(FEATURE_KEYS).parse(formData.get('key')); const enabled = formData.get('enabled') === 'true';
  await platformPrisma.$transaction([platformPrisma.tenantFeatureOverride.upsert({ where: { tenantId_key: { tenantId, key } }, create: { tenantId, key, enabled, reason: 'SuperAdmin' }, update: { enabled, reason: 'SuperAdmin' } }), platformPrisma.platformAuditLog.create({ data: { actorId: actor.userId, tenantId, action: enabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED', entityType: 'Feature', entityId: key } })]); clearFeatureCache(); refresh(tenantId);
}

export async function savePlan(formData: FormData) {
  const actor = await requirePlatformAdmin(); const parsed = planSchema.parse(Object.fromEntries(formData)); const enabledFeatures = FEATURE_KEYS.filter(key => formData.get(`feature:${key}`) === 'on');
  await platformPrisma.$transaction(async tx => { const plan = await tx.plan.upsert({ where: { code: parsed.code }, create: { code: parsed.code, name: parsed.name, price: parsed.price, currency: 'ARS', isActive: true }, update: { name: parsed.name, price: parsed.price, isActive: true } }); await tx.planFeature.deleteMany({ where: { planId: plan.id } }); if (enabledFeatures.length) await tx.planFeature.createMany({ data: enabledFeatures.map(key => ({ planId: plan.id, key, enabled: true })) }); await tx.platformAuditLog.create({ data: { actorId: actor.userId, action: 'PLAN_SAVED', entityType: 'Plan', entityId: plan.id, metadata: { code: parsed.code } } }); }); clearFeatureCache(); refresh();
}

export async function addTenantDomain(formData: FormData) {
  const actor = await requirePlatformAdmin(); const tenantId = z.string().uuid().parse(formData.get('tenantId')); const hostname = normalizeHostname(z.string().min(4).max(255).parse(formData.get('hostname'))); if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) throw new Error('Dominio inválido'); const platformHost = (process.env.PLATFORM_HOST || 'onlypadel.nanoapps.ar').toLowerCase(); if (hostname === platformHost) throw new Error('El dominio de plataforma está reservado.'); const baseDomain = (process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar').toLowerCase(); const autoVerified = hostname.endsWith(`.${baseDomain}`);
  await platformPrisma.$transaction(async tx => { const domain = await tx.tenantDomain.create({ data: { tenantId, hostname, isPrimary: false, verifiedAt: autoVerified ? new Date() : null } }); await tx.platformAuditLog.create({ data: { actorId: actor.userId, tenantId, action: 'DOMAIN_ADDED', entityType: 'TenantDomain', entityId: domain.id, metadata: { hostname, autoVerified } } }); }); clearTenantResolutionCache(); refresh(tenantId);
}

export async function verifyTenantDomain(formData: FormData) {
  const actor = await requirePlatformAdmin(); const domainId = z.string().uuid().parse(formData.get('domainId')); const domain = await platformPrisma.tenantDomain.update({ where: { id: domainId }, data: { verifiedAt: new Date() } }); await platformPrisma.platformAuditLog.create({ data: { actorId: actor.userId, tenantId: domain.tenantId, action: 'DOMAIN_VERIFIED', entityType: 'TenantDomain', entityId: domain.id, metadata: { hostname: domain.hostname } } }); clearTenantResolutionCache(); refresh(domain.tenantId);
}
