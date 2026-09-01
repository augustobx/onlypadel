import 'server-only';

import { headers } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  hostname: string;
  timezone: string;
};

const PLATFORM_HOST = (process.env.PLATFORM_HOST || 'onlypadel.nanoapps.ar').toLowerCase();
const BASE_DOMAIN = (process.env.TENANT_BASE_DOMAIN || 'nanoapps.ar').toLowerCase();
const cache = new Map<string, { expiresAt: number; value: Promise<TenantContext | null> }>();

export class TenantResolutionError extends Error {
  constructor(message = 'TENANT_NOT_FOUND') {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

export function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

async function requestHostname() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get('x-forwarded-host')?.split(',')[0];
  return normalizeHostname(forwardedHost || headerStore.get('host') || '');
}

export async function findTenant(hostname: string): Promise<TenantContext | null> {
  const domain = await platformPrisma.tenantDomain.findUnique({
    where: { hostname },
    include: { tenant: true },
  });

  let tenant = domain?.verifiedAt ? domain.tenant : null;
  if (!tenant && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes('.') && slug !== PLATFORM_HOST.split('.')[0]) {
      tenant = await platformPrisma.tenant.findUnique({ where: { slug } });
    }
  }

  if (!tenant || tenant.status !== 'ACTIVE') return null;
  return { id: tenant.id, slug: tenant.slug, name: tenant.name, hostname, timezone: tenant.timezone };
}

export async function resolveTenantContext(): Promise<TenantContext> {
  const trustedTenantId = process.env.ONLYPADEL_TENANT_ID;
  if (trustedTenantId) {
    const tenant = await platformPrisma.tenant.findUnique({ where: { id: trustedTenantId } });
    if (!tenant || tenant.status !== 'ACTIVE') throw new TenantResolutionError();
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      hostname: `${tenant.slug}.${BASE_DOMAIN}`,
      timezone: tenant.timezone,
    };
  }

  const hostname = await requestHostname();
  if (!hostname || hostname === PLATFORM_HOST) throw new TenantResolutionError();
  const existing = cache.get(hostname);
  if (existing && existing.expiresAt > Date.now()) {
    const value = await existing.value;
    if (value) return value;
    throw new TenantResolutionError();
  }

  const value = findTenant(hostname);
  cache.set(hostname, { value, expiresAt: Date.now() + 2_000 });
  const tenant = await value;
  if (!tenant) throw new TenantResolutionError();
  return tenant;
}

export function clearTenantResolutionCache() {
  cache.clear();
}

export async function isPlatformRequest() {
  const hostname = await requestHostname();
  return hostname === PLATFORM_HOST || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(hostname));
}
