import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase'; // Use regular client as fallback

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

    // For debugging
    console.log('Fetching user data for userId:', user.userId);

    try {
      // Simply return the user info from the token without database lookup
      // This avoids Supabase service key issues in production
      return NextResponse.json({
        userId: user.userId,
        email: user.email || `User ${user.userId.substring(0, 8)}...`,
        timestamp: user.timestamp,
        exp: user.exp
      });
    } catch (dbError) {
      console.error('Database error in /api/users/me:', dbError);
      
      // Fall back to just returning the token info
      return NextResponse.json({
        userId: user.userId,
        email: null,
        timestamp: user.timestamp,
        exp: user.exp
      });
    }
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
