import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Check for any auth source
function isAuthenticated(req: NextRequest): boolean {
  // Check for cookies
  const hasCookies = req.cookies.has('shared_auth_token') || 
                    req.cookies.has('shared_auth_token_secure');
  
  if (hasCookies) {
    return true;
  }
  
  // Check for token in query string (useful for initial redirects)
  const hasTokenParam = !!req.nextUrl.searchParams.get('token');
  
  // Check for special headers (could be set by your frontend)
  const hasAuthHeader = req.headers.get('x-auth-token') !== null;
  
  return hasCookies || hasTokenParam || hasAuthHeader;
}

export async function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname;
    
    // Always allow debug and API routes
    if (path === '/debug' || path.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    // Only enforce auth for admin routes
    if (path === '/admin' || path.startsWith('/admin/')) {
      const authenticated = isAuthenticated(req);
      console.log(`Middleware auth check: path=${path}, authenticated=${authenticated}`, {
        hasCookie: req.cookies.has('shared_auth_token'),
        hasSecureCookie: req.cookies.has('shared_auth_token_secure'),
        hasTokenParam: !!req.nextUrl.searchParams.get('token'),
      });
      
      // Bypass auth check for certain user agents or with token in URL
      const userAgent = req.headers.get('user-agent') || '';
      const isCrawler = userAgent.includes('bot') || userAgent.includes('crawler');
      const hasTokenInUrl = !!req.nextUrl.searchParams.get('token');
      
      // Skip auth check for crawlers or if token is in URL
      if (isCrawler || hasTokenInUrl) {
        console.log('Bypassing auth check for crawler or token in URL');
        return NextResponse.next();
      }
      
      if (!authenticated) {
        console.log('Not authenticated, redirecting to login');
        
        // Build the login URL with all necessary parameters
        const origin = new URL(req.url).origin;
        const returnUrl = encodeURIComponent(`${origin}/admin`);
        const callbackUrl = encodeURIComponent(`${origin}/api/auth/callback`);
        
        // Use environment variable for login URL if available
        const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                           'https://photobooth.waibooth.app/photobooth-ia/admin/login';
                           
        const loginUrl = `${loginBaseUrl}?returnUrl=${returnUrl}&callbackUrl=${callbackUrl}&shared=true`;
        
        console.log('Redirecting to:', loginUrl);
        return NextResponse.redirect(loginUrl);
      }
    }
    
    // Allow all other requests
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/api/:path*', 
    '/debug',
  ],
};
