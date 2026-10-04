import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/vapid';

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    return NextResponse.json({ error: 'Failed to retrieve public key' }, { status: 500 });
  }
}
