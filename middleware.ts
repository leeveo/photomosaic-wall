import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './utils/sharedAuth';

export async function middleware(req: NextRequest) {
  console.log('Middleware executing for path:', req.nextUrl.pathname);
  
  const path = req.nextUrl.pathname;
  
  // Check if this is an admin route
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  
  // Skip authentication check for API routes and auth callback
  const isExcluded = path === '/api/auth/callback' || path.startsWith('/api/auth/');
  
  if (isAdminRoute && !isExcluded) {
    // Check if user is authenticated
    const user = await getCurrentUser(req);
    
    console.log('Current user from shared auth:', user);
    
    if (!user) {
      // Not authenticated, redirect to main app login with return URL
      const returnUrl = new URL(req.url).origin + '/admin';
      const callbackUrl = new URL(req.url).origin + '/api/auth/callback';
      
      // Construct the full login URL with both callback and return URL
      const loginUrlBase = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      const loginUrl = new URL(loginUrlBase);
      loginUrl.searchParams.set('callbackUrl', callbackUrl);
      loginUrl.searchParams.set('returnUrl', returnUrl);
      
      console.log('Redirecting to login:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }
    
    // User is authenticated, let them continue
    return NextResponse.next();
  }
  
  // For non-admin routes or excluded routes, just continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
  ],
};
