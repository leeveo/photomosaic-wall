import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';

// Simple cache to prevent excessive checks
const statusCache = new Map<string, { status: any, timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(req: NextRequest) {
  try {
    // Generate a cache key based on cookies
    const cacheKey = Array.from(req.cookies.getAll())
      .map(c => `${c.name}=${c.value.substring(0, 10)}`)
      .join('|');
    
    // Check cache
    const now = Date.now();
    const cachedStatus = statusCache.get(cacheKey);
    
    if (cachedStatus && (now - cachedStatus.timestamp < CACHE_TTL)) {
      return NextResponse.json(cachedStatus.status);
    }
    
    // Not in cache, check current user
    const user = await getCurrentUser(req);
    
    const status = {
      authenticated: !!user,
      user: user ? {
        userId: user.userId,
        email: user.email || undefined
      } : null,
      cookies: {
        hasSharedAuth: req.cookies.has('shared_auth_token'),
        hasSharedAuthSecure: req.cookies.has('shared_auth_token_secure'),
        hasSharedAuthJs: req.cookies.has('shared_auth_token_js')
      }
    };
    
    // Update cache
    statusCache.set(cacheKey, { status, timestamp: now });
    
    // Status code is always 200 to avoid error handling loops in the client
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in auth status:', error);
    
    // Don't use error status codes to prevent potential redirect loops
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Error checking authentication',
      errorDetails: error instanceof Error ? error.message : String(error)
    });
  }
}
