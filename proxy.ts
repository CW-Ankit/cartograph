import { auth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

const neonAuthMiddleware = auth.middleware({ loginUrl: '/auth/sign-in' });

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Defensive pass-through for public routes and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/preview') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(?:css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  return neonAuthMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!_next|auth|sign-in|sign-up|preview|api/auth|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
