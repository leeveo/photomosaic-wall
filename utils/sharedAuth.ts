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

    // Log token format for debugging (partial, for security)
    console.log('Token format check:', {
      length: token.length,
      start: token.substring(0, 10),
      containsDots: token.includes('.'),
      parts: token.split('.').length
    });

    // Check if this is a non-JWT token (without dots)
    if (!token.includes('.')) {
      try {
        // Try to decode as base64 directly
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        console.log('Attempting to decode as base64 string');
        
        try {
          const parsedUser = JSON.parse(decoded);
          console.log('Successfully parsed decoded token as JSON');
          
          // Check if it has expected fields
          if (parsedUser.userId) {
            return parsedUser as UserPayload;
          }
          console.log('Decoded token missing required fields');
        } catch (jsonError) {
          // Fix the TypeScript error by using a type guard
          console.error('Failed to parse decoded token as JSON:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
        }
      } catch (decodeError) {
        // Fix the TypeScript error by using a type guard
        console.error('Failed to decode token as base64:', decodeError instanceof Error ? decodeError.message : 'Unknown error');
      }
    }

    // Standard JWT verification as fallback
    const secret = new TextEncoder().encode(SHARED_AUTH_SECRET);
    
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as UserPayload;
    } catch (jwtError) {
      // Fix TypeScript error by using a type guard
      console.error('JWT verification failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error verifying shared token:', error);
    return null;
  }
}

// Get the current user from the shared token cookie
export async function getCurrentUser(req: NextRequest): Promise<UserPayload | null> {
  try {
    // Handle both Promise and non-Promise cookies (Vercel vs local)
    const cookies = req.cookies instanceof Promise ? await req.cookies : req.cookies;
    const token = cookies.get?.(COOKIE_NAME)?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }
    
    console.log('Found auth token in cookies, verifying...');
    return await verifySharedToken(token);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Set the shared auth cookie on a response
export function setSharedAuthCookie(response: NextResponse, token: string): NextResponse {
  console.log('Setting shared auth cookie, token length:', token.length);
  
  // Sanitize token - ensure it's a valid JWT format (header.payload.signature)
  if (!token.includes('.') || token.split('.').length !== 3) {
    console.error('Invalid token format, not setting cookie');
    return response;
  }
  
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
