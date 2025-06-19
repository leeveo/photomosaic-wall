import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';

// Use a simple in-memory cache to reduce duplicate requests
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // Get user from auth token
    const user = await getCurrentUser(req);
    
    console.log('API /users/me - User from token:', user);
    
    if (!user || !user.userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'No valid user token found'
      }, { status: 401 });
    }

    // Check cache first
    const cacheKey = user.userId;
    const cachedData = cache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      console.log('Returning cached user data for:', user.userId);
      return NextResponse.json(cachedData.data);
    }
    
    console.log('Fetching user data for userId:', user.userId);
    
    // Simulated user data - replace with your actual data fetching
    const userData = {
      id: user.userId,
      email: user.email || 'user@example.com',
      name: 'Admin User',
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };
    
    // Update cache
    cache.set(cacheKey, { data: userData, timestamp: now });
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
