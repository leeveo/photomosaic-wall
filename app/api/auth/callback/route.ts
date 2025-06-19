import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get token from the URL parameters
    const token = req.nextUrl.searchParams.get('token');
    console.log('Auth callback received token:', !!token);
    
    if (!token) {
      console.error('No token in callback');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Get returnUrl from parameters or default to admin
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/admin';
    
    // Create response to redirect to admin page
    const response = NextResponse.redirect(new URL(returnUrl, req.url));
    
    // Set the cookie on the client side
    // Important: Make sure it's not httpOnly so our client-side code can detect it
    response.cookies.set({
      name: 'shared_auth_token',
      value: token,
      httpOnly: false, // Make it visible to JS
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    // Also set a duplicate httpOnly cookie for security
    response.cookies.set({
      name: 'shared_auth_token_secure',
      value: token,
      httpOnly: true, // This one is secure and not accessible by JS
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    console.log('Setting auth cookies and redirecting to:', returnUrl);
    return response;
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
