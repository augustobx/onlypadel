import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const data = await req.json();
    const { endpoint } = data;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Internal server error' }, { status });
  }
}
