import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth check: token in URL, admin_session/shared_auth_token cookie, has_auth_in_ls, or bypass param
function isAuthenticated(req: NextRequest): boolean {
  // 1. Token in URL
  if (req.nextUrl.searchParams.get('token')) {
    console.log('Token in URL - access granted');
    return true;
  }
  // 2. admin_session cookie (from main app)
  if (req.cookies.has('admin_session')) {
    console.log('admin_session cookie found - access granted');
    return true;
  }
  // 3. shared_auth_token cookie
  if (req.cookies.has('shared_auth_token')) {
    console.log('shared_auth_token cookie found - access granted');
    return true;
  }
  // 4. has_auth_in_ls flag
  if (req.cookies.has('has_auth_in_ls')) {
    console.log('has_auth_in_ls cookie found - access granted');
    return true;
  }
  // 5. bypass param for dev/test
  if (req.nextUrl.searchParams.get('bypass') === 'true') {
    console.log('Bypass param - access granted');
    return true;
  }
  console.log('No authentication found');
  return false;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  console.log('Middleware:', path, req.url);

  // Always allow public/static paths
  if (
    path.startsWith('/api/') ||
    path === '/' ||
    path.startsWith('/_next/') ||
    path.includes('auth-success') ||
    path.includes('auth-redirect') ||
    path.includes('auth-callback') ||
    path.includes('debug') ||
    path.includes('favicon')
  ) {
    return NextResponse.next();
  }

  // Protect /admin routes
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAuthenticated(req)) {
      console.log('Not authenticated, redirecting to login');
      const loginBaseUrl =
        process.env.NEXT_PUBLIC_AUTH_LOGIN_URL ||
        'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      const currentUrl = req.nextUrl.toString();
      const callbackUrl = new URL('/auth-callback', req.nextUrl.origin);
      const loginUrl = new URL(loginBaseUrl);
      loginUrl.searchParams.set('returnUrl', currentUrl);
      loginUrl.searchParams.set('callbackUrl', callbackUrl.toString());
      loginUrl.searchParams.set('shared', 'true');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
