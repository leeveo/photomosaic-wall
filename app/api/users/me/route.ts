import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySharedToken } from '@/utils/sharedAuth';

// Create a Supabase client with the service role key to access admin_users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // Extract the token from cookies
    const token = req.cookies.get('shared_auth_token')?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return NextResponse.json({
        error: 'Unauthorized',
        authenticated: false
      }, { status: 401 });
    }
    
    // Verify the token to get the user ID
    const user = await verifySharedToken(token);
    
    if (!user || !user.userId) {
      console.log('Invalid token or missing userId');
      return NextResponse.json({
        error: 'Invalid token',
        authenticated: false
      }, { status: 401 });
    }
    
    console.log('Looking up user in admin_users table with ID:', user.userId);
    
    // Fixed: Use the correct table name and query
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('id', user.userId)
      .single();
    
    if (error) {
      console.error('Error querying admin_users table:', error);
      
      // Try an alternative lookup by email if userId doesn't work
      if (user.email) {
        console.log('Trying alternative lookup by email:', user.email);
        const { data: userByEmail, error: emailError } = await supabase
          .from('admin_users')
          .select('id, email, name, role')
          .eq('email', user.email)
          .single();
          
        if (!emailError && userByEmail) {
          console.log('Found user by email:', userByEmail);
          return NextResponse.json({
            id: userByEmail.id,
            email: userByEmail.email,
            name: userByEmail.name || 'Admin User',
            role: userByEmail.role || 'admin',
            permissions: ['read', 'write', 'admin'],
            source: 'database_email_lookup'
          });
        }
      }
      
      // Debug: List all users in the admin_users table
      const { data: allUsers } = await supabase
        .from('admin_users')
        .select('id, email')
        .limit(10);
        
      console.log('Available users in admin_users table:', allUsers);
      
      // Fallback to basic info from token
      return NextResponse.json({
        id: user.userId,
        email: user.email || 'user@example.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        source: 'token_fallback'
      });
    }
    
    if (!adminUser) {
      console.log('User not found in admin_users table:', user.userId);
      
      // Debug: Show list of users
      const { data: allUsers } = await supabase
        .from('admin_users')
        .select('id, email')
        .limit(10);
        
      console.log('Available users in admin_users table:', allUsers);
      
      return NextResponse.json({
        id: user.userId,
        email: user.email || 'user@example.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        source: 'token_fallback'
      });
    }
    
    console.log('Found user in admin_users table:', adminUser);
    
    // Return user data from the database
    return NextResponse.json({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name || 'Admin User',
      role: adminUser.role || 'admin',
      permissions: ['read', 'write', 'admin'],
      source: 'database'
    });
    
  } catch (error) {
    console.error('Error in /api/users/me:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
