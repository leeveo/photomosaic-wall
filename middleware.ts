import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified authentication check
function isAuthenticated(req: NextRequest): boolean {
  // Debug: log all cookies for troubleshooting
  console.log('All cookies:', req.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 5)}...`));
  
  // Check for token in query string FIRST (highest priority)
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) {
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
  
  // Check direct localStorage flag
  if (req.cookies.has('has_auth_in_ls')) {
    console.log('Local storage auth flag found - allowing access');
    return true;
  }
  
  // NEW: Check for bypass flag (emergency access)
  if (req.nextUrl.searchParams.get('bypass') === 'true') {
    console.log('EMERGENCY BYPASS used - allowing access');
    return true;
  }
  
  console.log('No authentication source found');
  return false;
}

export async function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname;
    
    // Add a debug param to see if middleware is running
    console.log(`Middleware checking: ${path}`, {
      url: req.url,
      hasCookies: req.cookies.getAll().length > 0,
      hasToken: !!req.nextUrl.searchParams.get('token'),
      cookies: req.cookies.getAll().map(c => c.name)
    });
    
    // IMPORTANT: Always allow these paths
    if (
      path.startsWith('/api/') || 
      path === '/debug' || 
      path === '/debug/users' ||
      path === '/' ||
      path === '/auth-success' ||
      path.startsWith('/auth-redirect') ||
      path.startsWith('/check-session.html') ||
      path.startsWith('/_next/') ||
      path.includes('favicon.ico')
    ) {
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
        
        // SIMPLIFIED: Use the most basic auth redirect approach
        const authRedirectUrl = new URL('/auth-redirect', req.url);
        // Pass the originally requested URL as a parameter - SIMPLIFIED url encoding
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
