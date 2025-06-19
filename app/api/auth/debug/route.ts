import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';

export async function GET(req: NextRequest) {
  try {
    // Get current user info
    const user = await getCurrentUser(req);
    
    // Get cookie information
    const cookieInfo = {
      allCookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...'])),
      hasSharedAuth: req.cookies.has('shared_auth_token'),
      hasSharedAuthSecure: req.cookies.has('shared_auth_token_secure'),
      hasSharedAuthJs: req.cookies.has('shared_auth_token_js'),
    };
    
    // Parse auth header if present
    let authHeader = null;
    if (req.headers.get('authorization')) {
      authHeader = req.headers.get('authorization')?.substring(0, 20) + '...';
    }
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        userId: user.userId,
        email: user.email || undefined,
        timestamp: user.timestamp,
        exp: user.exp,
      } : null,
      cookies: cookieInfo,
      headers: {
        userAgent: req.headers.get('user-agent'),
        hasAuth: !!req.headers.get('authorization'),
        authHeader
      }
    });
  } catch (error) {
    console.error('Error in auth debug:', error);
    return NextResponse.json({ 
      error: 'Error checking authentication',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
