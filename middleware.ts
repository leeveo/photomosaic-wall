import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified authentication check with maximum tolerance
function isAuthenticated(req: NextRequest): boolean {
  try {
    // Debug: log all cookies for troubleshooting
    console.log('All cookies:', req.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 5)}...`));
    
    // EMERGENCY ACCESS - highest priority
    if (req.nextUrl.searchParams.get('bypass') === 'true') {
      console.log('EMERGENCY BYPASS used - access granted');
      return true;
    }
    
    // Check for token in query string (next highest priority)
    const tokenParam = req.nextUrl.searchParams.get('token');
    if (tokenParam) {
      console.log('Token found in URL params - access granted');
      return true;
    }
    
    // Accept ANY auth-related cookie
    const authCookies = req.cookies.getAll().filter(c => 
      c.name.toLowerCase().includes('auth') || 
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('session')
    );
    
    if (authCookies.length > 0) {
      console.log(`Found ${authCookies.length} auth-related cookies - access granted`);
      return true;
    }
    
    // Check localStorage flag
    if (req.cookies.has('has_auth_in_ls')) {
      console.log('Local storage auth flag found - access granted');
      return true;
    }
    
    console.log('No authentication source found - access denied');
    return false;
  } catch (error) {
    console.error('Error in isAuthenticated:', error);
    // On error, allow access as a failsafe
    return true;
  }
}

export async function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname;
    
    // Add a debug param to see if middleware is running
    console.log(`Middleware checking: ${path}`, {
      url: req.url,
      hasToken: !!req.nextUrl.searchParams.get('token'),
      cookies: req.cookies.getAll().map(c => c.name)
    });
    
    // Public paths - always allow
    const publicPaths = [
      '/api/', 
      '/debug',
      '/',
      '/auth-success',
      '/auth-redirect',
      '/_next/',
      'favicon.ico'
    ];
    
    if (publicPaths.some(p => path === p || path.startsWith(p))) {
      return NextResponse.next();
    }
    
    // Only enforce auth for admin routes
    if (path === '/admin' || path.startsWith('/admin/')) {
      const authenticated = isAuthenticated(req);
      
      if (!authenticated) {
        console.log('Authentication failed, redirecting to auth-redirect');
        
        // Create a direct link to the main app login with correct return URL
        const mainAppLoginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                      'https://photobooth.waibooth.app/photobooth-ia/admin/login';
        
        // Create the return URL for after login
        const currentUrl = new URL(req.url);
        const returnUrl = `${currentUrl.origin}/auth-success?returnTo=${encodeURIComponent(path)}`;
        
        // Build the final redirect URL
        const loginRedirectUrl = new URL(mainAppLoginUrl);
        loginRedirectUrl.searchParams.set('returnUrl', returnUrl);
        loginRedirectUrl.searchParams.set('callbackUrl', `${currentUrl.origin}/api/auth/callback`);
        loginRedirectUrl.searchParams.set('shared', 'true');
        
        console.log('Redirecting to:', loginRedirectUrl.toString());
        return NextResponse.redirect(loginRedirectUrl);
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
