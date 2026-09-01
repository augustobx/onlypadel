import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const USER_SESSION_COOKIE = 'onlypadel_user_session';
const USER_SESSION_TTL = 60 * 60 * 24 * 30;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createUserSession(userId: string) {
  const tenant = await resolveTenantContext();
  const token = randomBytes(32).toString('base64url');
  await platformPrisma.userSession.create({
    data: { tenantId: tenant.id, userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + USER_SESSION_TTL * 1000) },
  });
  (await cookies()).set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: USER_SESSION_TTL,
    path: '/',
  });
}

export async function readUserSessionId() {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tenant = await resolveTenantContext();
  const session = await platformPrisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true, tenant: true },
  });
  if (!session || session.tenantId !== tenant.id || session.revokedAt || session.expiresAt <= new Date() ||
      session.tenant.status !== 'ACTIVE' || !session.user.isActive) return null;
  return session.userId;
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (token) await platformPrisma.userSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  cookieStore.delete(USER_SESSION_COOKIE);
  cookieStore.delete('tpadel_user_session');
}
