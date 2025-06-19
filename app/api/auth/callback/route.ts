import { NextRequest, NextResponse } from 'next/server';
import { setSharedAuthCookie, verifySharedToken } from '@/utils/sharedAuth';

export async function GET(req: NextRequest) {
  console.log('Auth callback received');
  
  // Get the token from the URL
  const token = req.nextUrl.searchParams.get('token');
  
  if (!token) {
    console.error('No token provided in callback');
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 400 }
    );
  }
  
  console.log('Auth callback received with token:', {
    length: token.length,
    start: token.substring(0, 10),
    format: token.includes('.') ? 'Contains dots' : 'No dots',
    parts: token.split('.').length
  });
  
  // Verify the token is valid before setting it
  const user = await verifySharedToken(token);
  if (!user) {
    console.error('Invalid token received in callback');
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 400 }
    );
  }
  
  // Get the redirect URL from the query params or use default
  const redirectTo = req.nextUrl.searchParams.get('redirect') || '/admin';
  
  console.log('Token verified, redirecting to:', redirectTo);
  
  // Create a response that redirects to the admin page
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  
  // Set the auth cookie
  setSharedAuthCookie(response, token);
  
  return response;
}
