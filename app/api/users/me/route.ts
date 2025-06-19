import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get user from auth token
    const user = await getCurrentUser(req);
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query the admin_users table to get the user's email
    const { data, error } = await supabase
      .from('admin_users')
      .select('email')
      .eq('id', user.userId)
      .single();

    if (error) {
      console.error('Error fetching user email:', error);
      return NextResponse.json(
        { userId: user.userId, email: null, error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    // Return user info with email from database
    return NextResponse.json({
      userId: user.userId,
      email: data?.email || null,
      timestamp: user.timestamp,
      exp: user.exp
    });
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
