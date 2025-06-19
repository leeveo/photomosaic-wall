import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'Not authenticated',
        cookies: {
          hasSharedAuth: req.cookies.has('shared_auth_token'),
          hasSharedAuthSecure: req.cookies.has('shared_auth_token_secure'),
          hasSharedAuthJs: req.cookies.has('shared_auth_token_js')
        }
      }, { status: 401 });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        userId: user.userId,
        email: user.email || undefined
      },
      cookies: {
        hasSharedAuth: req.cookies.has('shared_auth_token'),
        hasSharedAuthSecure: req.cookies.has('shared_auth_token_secure'),
        hasSharedAuthJs: req.cookies.has('shared_auth_token_js')
      }
    });
  } catch (error) {
    console.error('Error in auth status:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Error checking authentication'
    }, { status: 500 });
  }
}
