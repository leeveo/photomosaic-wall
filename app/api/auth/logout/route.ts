import { NextRequest, NextResponse } from 'next/server';
import { clearSharedAuthCookie } from '@/utils/sharedAuth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSharedAuthCookie(response);
}

export async function GET(req: NextRequest) {
  // Create a response that redirects to the login page
  const loginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
  const response = NextResponse.redirect(loginUrl);
  
  // Clear the auth cookie
  clearSharedAuthCookie(response);
  
  console.log('User logged out, redirecting to:', loginUrl);
  return response;
}
