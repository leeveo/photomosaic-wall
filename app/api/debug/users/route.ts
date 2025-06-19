import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role to access admin_users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // Check for environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        supabaseUrlPresent: !!supabaseUrl,
        serviceKeyPresent: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    console.log('Querying admin_users table with service role');
    
    // Query the admin_users table
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error querying admin_users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`Found ${data?.length || 0} users in admin_users table`);
    
    return NextResponse.json({ 
      users: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('Error in /api/debug/users:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
