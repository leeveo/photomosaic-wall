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
  
  // For non-admin routes or excluded routes, just continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
  ],
};
