import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SHARED_AUTH_SECRET = process.env.SHARED_AUTH_SECRET || '';
const COOKIE_NAME = 'shared_auth_token';

interface UserPayload {
  userId: string;
  email?: string;
}

// Verify a shared token
export async function verifySharedToken(token: string): Promise<UserPayload | null> {
  try {
    if (!SHARED_AUTH_SECRET) {
      console.error('SHARED_AUTH_SECRET environment variable is not set');
      return null;
    }

    const secret = new TextEncoder().encode(SHARED_AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return payload as unknown as UserPayload;
  } catch (error) {
    console.error('Error verifying shared token:', error);
    return null;
  }
}

// Get the current user from the shared token cookie
export async function getCurrentUser(req: NextRequest): Promise<UserPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifySharedToken(token);
}

// Set the shared auth cookie on a response
export function setSharedAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  });
  
  return response;
}

// Clear the auth cookie (for logout)
export function clearSharedAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  
  return response;
}
