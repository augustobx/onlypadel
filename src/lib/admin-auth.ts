import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const ADMIN_COOKIE_NAME = 'tpadel_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = { username: string; expiresAt: number };

async function getSigningSecret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 1 },
    select: { adminUser: true, adminPass: true },
  });
  if (!settings) throw new Error('ADMIN_NOT_CONFIGURED');
  return createHmac('sha256', process.env.DATABASE_URL || 'tpadel')
    .update(`${settings.adminUser}:${settings.adminPass}`)
    .digest('hex');
}

function decode(value: string): AdminSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<AdminSession>;
    if (typeof parsed.username !== 'string' || typeof parsed.expiresAt !== 'number') return null;
    return { username: parsed.username, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

async function sign(value: string) {
  return createHmac('sha256', await getSigningSecret()).update(value).digest('base64url');
}

export async function createAdminSession(username: string) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  }), 'utf8').toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, suppliedSignature] = token.split('.');
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = await sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  const session = decode(payload);
  return session && session.expiresAt > Date.now() ? session : null;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  cookieStore.delete('admin_auth');
}
