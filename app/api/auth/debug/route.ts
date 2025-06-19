import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';

export async function GET(req: NextRequest) {
  try {
    // Get current authentication state
    const user = await getCurrentUser(req);
    
    // Get all cookies for debugging
    const allCookies = req.cookies.getAll().map(c => ({
      name: c.name,
      value: c.value.substring(0, 10) + '...',
      size: c.value.length
    }));
    
    // Get request info
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Return detailed debug info
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: !!user,
      user: user ? {
        userId: user.userId,
        hasEmail: !!user.email,
      } : null,
      cookies: {
        count: allCookies.length,
        details: allCookies,
        hasSharedAuth: req.cookies.has('shared_auth_token'),
        hasSharedAuthSecure: req.cookies.has('shared_auth_token_secure')
      },
      requestInfo: {
        method: req.method,
        url: req.url,
        referrer: headers.referer || null,
        userAgent: headers['user-agent'] || null
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
