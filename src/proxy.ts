import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  // Solo interceptamos rutas de /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('onlypadel_admin_session');
    
    // Si no tiene la cookie de sesión iniciada, lo mandamos al login
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
