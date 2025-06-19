import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';
import { supabaseAdmin } from '@/lib/supabase.server';

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
      // Query the admin_users table to get the user's email
      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .select('email')
        .eq('id', user.userId)
        .single();

      if (error) {
        console.error('Error fetching user email:', error);
        
        // Return the userId even if we can't get the email
        return NextResponse.json({
          userId: user.userId,
          email: null,
          timestamp: user.timestamp,
          exp: user.exp
        });
      }

      // Return user info with email from database
      return NextResponse.json({
        userId: user.userId,
        email: data?.email || null,
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
