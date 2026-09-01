import { NextRequest, NextResponse } from 'next/server';
import { findTenant, normalizeHostname } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  const domain = normalizeHostname(
    request.nextUrl.searchParams.get('domain') || ''
  );

  if (!domain) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const tenant = await findTenant(domain);

    if (!tenant) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Tenant Ask Error]', error);
    return new NextResponse(null, { status: 500 });
  }
}
