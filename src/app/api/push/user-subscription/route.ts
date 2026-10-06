import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readUserSessionId } from '@/lib/user-session';
import { requireTenantFeature } from '@/lib/features';

async function requireActiveUser() {
  await requireTenantFeature('push');
  const userId = await readUserSessionId();
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { id: true },
  });

  return user?.id || null;
}

export async function GET(req: Request) {
  try {
    const userId = await requireActiveUser();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpoint = new URL(req.url).searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json({ subscribed: false });
    }

    const count = await prisma.pushSubscription.count({
      where: { userId, endpoint },
    });

    return NextResponse.json({ subscribed: count > 0 });
  } catch (error) {
    console.error('Error reading user push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireActiveUser();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const subscription = data?.subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Un endpoint representa este navegador/dispositivo. Lo vinculamos a la
    // cuenta que acaba de activar las notificaciones para evitar fugas entre cuentas.
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: subscription.endpoint },
    });

    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireActiveUser();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const endpoint = data?.endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
