import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './utils/sharedAuth';

export async function middleware(req: NextRequest) {
  console.log('Middleware executing for path:', req.nextUrl.pathname);
  
  const path = req.nextUrl.pathname;
  
  // Check if this is an admin route
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  
  // Skip authentication check for API routes and auth callback
  const isExcluded = path === '/api/auth/callback';
  
  if (isAdminRoute && !isExcluded) {
    // Check if user is authenticated
    const user = await getCurrentUser(req);
    
    if (!user) {
      // Not authenticated, redirect to main app login
      const loginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      return NextResponse.redirect(loginUrl);
    }
    
    // User is authenticated, let them continue
    const res = NextResponse.next();
    
    return res;
  }

  // Get hostname (e.g. vercel.com, test.vercel.app, etc.)
  const hostname = req.headers.get('host');
  
  // Define the source and destination domains
  const sourceDomain = 'source.waibooth.app'; // Replace with your source domain
  const targetDomain = 'mosaic.waibooth.app'; // Your target domain
  
  // Redirect if hostname matches the source domain
  if (hostname === sourceDomain) {
    return NextResponse.redirect(
      `https://${targetDomain}${req.nextUrl.pathname}${req.nextUrl.search}`,
      { status: 301 }
    );
  }
  
  // For non-admin routes or excluded routes, just continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
