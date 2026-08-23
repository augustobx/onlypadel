'use client';

const STORAGE_KEY = 'tpadel.booking-request.v1';
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredRequest = {
  signature: string;
  requestKey: string;
  createdAt: number;
};

function newRequestKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replaceAll('-', '');
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateBookingRequestKey(courtId: string, date: string, time: string) {
  const signature = `${courtId}|${date}|${time}`;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) as StoredRequest : null;
    if (stored?.signature === signature && Date.now() - stored.createdAt < MAX_AGE_MS) {
      return stored.requestKey;
    }
  } catch {
    // La reserva sigue funcionando aunque el navegador bloquee sessionStorage.
  }

  const requestKey = newRequestKey();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, requestKey, createdAt: Date.now() }));
  } catch {
    // Sin persistencia aún conservamos idempotencia durante este intento.
  }
  return requestKey;
}

export function clearBookingRequestKey() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}
