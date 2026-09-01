import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { platformPrisma } from '@/lib/prisma-core';

export const PLATFORM_COOKIE_NAME = 'onlypadel_platform_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createPlatformSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await platformPrisma.platformSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  (await cookies()).set(PLATFORM_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function getPlatformSession() {
  const token = (await cookies()).get(PLATFORM_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await platformPrisma.platformSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return { id: session.id, userId: session.userId, name: session.user.name, email: session.user.email, role: session.user.role };
}

export async function requirePlatformAdmin() {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') throw new Error('UNAUTHORIZED');
  return session;
}

export async function clearPlatformSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_COOKIE_NAME)?.value;
  if (token) {
    await platformPrisma.platformSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(PLATFORM_COOKIE_NAME);
}
