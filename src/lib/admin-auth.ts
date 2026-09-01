import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const ADMIN_COOKIE_NAME = 'onlypadel_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createAdminSession(userId: string) {
  const tenant = await resolveTenantContext();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await platformPrisma.adminSession.create({
    data: { tenantId: tenant.id, userId, tokenHash: hashToken(token), expiresAt },
  });
  (await cookies()).set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const tenant = await resolveTenantContext();
  const session = await platformPrisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true, tenant: true },
  });
  if (!session || session.tenantId !== tenant.id || session.revokedAt || session.expiresAt <= new Date() ||
      session.tenant.status !== 'ACTIVE' || session.user.role !== 'ADMIN' || !session.user.isActive) return null;
  return { id: session.id, tenantId: session.tenantId, userId: session.userId, name: session.user.name, email: session.user.email, expiresAt: session.expiresAt };
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (token) await platformPrisma.adminSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  cookieStore.delete(ADMIN_COOKIE_NAME);
  cookieStore.delete('tpadel_admin_session');
  cookieStore.delete('admin_auth');
}
