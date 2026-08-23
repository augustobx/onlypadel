import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const USER_SESSION_COOKIE = 'tpadel_user_session';
const USER_SESSION_TTL = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.USER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.DATABASE_URL;
  if (!value) throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  return createHmac('sha256', value).update('tpadel-user-session').digest();
}

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function createUserSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + USER_SESSION_TTL * 1000 })).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, `${payload}.${signature(payload)}`, {
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
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) return null;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: unknown; expiresAt?: unknown };
    return typeof parsed.userId === 'string' && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()
      ? parsed.userId
      : null;
  } catch {
    return null;
  }
}

export async function clearUserSession() {
  (await cookies()).delete(USER_SESSION_COOKIE);
}
