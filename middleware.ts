import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './utils/sharedAuth';

export async function middleware(req: NextRequest) {
  try {
    console.log('Middleware executing for path:', req.nextUrl.pathname);
    
    const path = req.nextUrl.pathname;
    
    // Check if this is an admin route
    const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
    
    // Skip authentication check for API routes and auth callback
    const isExcluded = path === '/api/auth/callback' || path.startsWith('/api/auth/');
    
    if (isAdminRoute && !isExcluded) {
      try {
        // Check if user is authenticated
        const user = await getCurrentUser(req);
        
        console.log('Current user from shared auth:', user);
        
        if (!user) {
          // Not authenticated, redirect to main app login with return URL
          const originUrl = new URL(req.url).origin;
          const returnUrl = `${originUrl}/admin`;
          
          // Get the login URL base from env or use default
          const loginUrlBase = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
          
          // Handle the case where login URL already has query parameters
          let loginUrlString = loginUrlBase;
          const hasQueryParams = loginUrlBase.includes('?');
          
          // Add returnUrl param using the appropriate separator
          if (hasQueryParams) {
            loginUrlString += `&returnUrl=${encodeURIComponent(returnUrl)}`;
          } else {
            loginUrlString += `?returnUrl=${encodeURIComponent(returnUrl)}`;
          }
          
          console.log('Redirecting to login:', loginUrlString);
          return NextResponse.redirect(loginUrlString);
        }
        
        // User is authenticated, let them continue
        return NextResponse.next();
      } catch (authError) {
        console.error('Authentication error in middleware:', authError);
        // If auth check fails, redirect to login as a fallback
        return NextResponse.redirect(process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login');
      }
    }
    
    // For non-admin routes or excluded routes, just continue
    return NextResponse.next();
  } catch (error) {
    console.error('Unhandled error in middleware:', error);
    // For any unhandled errors, continue to avoid breaking the site
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
  ],
};
