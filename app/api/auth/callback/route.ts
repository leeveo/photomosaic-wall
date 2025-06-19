import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get token from the URL parameters
    const token = req.nextUrl.searchParams.get('token');
    console.log('Auth callback received token:', !!token, 'Length:', token?.length);
    
    if (!token) {
      console.error('No token in callback');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Get returnUrl from parameters (now points to our auth-success page)
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/auth-success';

    // Add the token to the return URL
    const targetUrl = new URL(returnUrl);
    targetUrl.searchParams.set('token', token);
    
    console.log('Redirecting to:', targetUrl.toString());
    
    // Simple redirect to the auth-success page with token in URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth-redirect?error=callback_failed', req.url));
  }
}
