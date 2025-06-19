import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified authentication check
function isAuthenticated(req: NextRequest): boolean {
  // Check for token in query string FIRST (highest priority)
  const hasTokenParam = !!req.nextUrl.searchParams.get('token');
  if (hasTokenParam) {
    console.log('Token found in URL params - allowing access');
    return true;
  }
  
  // Check for cookies
  const hasCookies = req.cookies.has('shared_auth_token') || 
                    req.cookies.has('shared_auth_token_secure') ||
                    req.cookies.has('shared_auth_token_js');
  
  if (hasCookies) {
    console.log('Token found in cookies - allowing access');
    return true;
  }
  
  // Check for auth header (could be set by your frontend)
  const hasAuthHeader = req.headers.get('x-auth-token') !== null;
  if (hasAuthHeader) {
    console.log('Token found in headers - allowing access');
    return true;
  }
  
  // Last resort - check local storage flag (this is set by client-side code)
  // Note: We can't directly access localStorage from middleware, so we rely on a cookie flag
  const hasLSFlag = req.cookies.has('has_auth_in_ls');
  if (hasLSFlag) {
    console.log('Local storage auth flag found - allowing access');
    return true;
  }
  
  console.log('No authentication source found');
  return false;
}

export async function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname;
    
    // DEBUG: Log the request
    console.log(`Middleware checking: ${path}`, {
      hasCookies: req.cookies.getAll().length > 0,
      hasToken: !!req.nextUrl.searchParams.get('token'),
      cookies: req.cookies.getAll().map(c => c.name)
    });
    
    // Always allow API and public routes
    if (path.startsWith('/api/') || 
        path === '/debug' || 
        path.startsWith('/auth-redirect') ||
        path === '/') {
      return NextResponse.next();
    }
    
    // Only enforce auth for admin routes
    if (path === '/admin' || path.startsWith('/admin/')) {
      const authenticated = isAuthenticated(req);
      console.log(`Auth check for ${path}: ${authenticated ? 'ALLOWED' : 'DENIED'}`);
      
      // Skip auth check for crawlers
      const userAgent = req.headers.get('user-agent') || '';
      const isCrawler = userAgent.includes('bot') || userAgent.includes('crawler');
      if (isCrawler) {
        return NextResponse.next();
      }
      
      if (!authenticated) {
        console.log('Authentication failed, redirecting to auth-redirect page');
        
        // Redirect to our custom auth redirector page rather than directly to login
        const authRedirectUrl = new URL('/auth-redirect', req.url);
        // Pass the originally requested URL as a parameter
        authRedirectUrl.searchParams.set('returnTo', req.url);
        
        return NextResponse.redirect(authRedirectUrl);
      }
    }
    
    // Allow all other requests
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of errors, allow the request to proceed
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
