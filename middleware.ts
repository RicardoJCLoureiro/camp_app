// middleware.ts
import { NextResponse, NextRequest } from 'next/server';

// Parse a JWT without verifying the signature (good enough to check exp)
function parseJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Guard /dashboard (and subpaths) only
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const token = req.cookies.get('accessToken')?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Optional: check exp to avoid serving with an expired token
    const payload = parseJwt(token);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload?.exp || payload.exp <= nowSec) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
