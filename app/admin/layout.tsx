import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySharedToken } from '@/utils/sharedAuth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Get user info from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('shared_auth_token')?.value;
    
    console.log('Admin layout - Token present:', !!token);
    
    // If no token, redirect to login
    if (!token) {
      // Create the login URL with a return URL back to this app
      const returnUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mosaic.waibooth.app';
      const loginUrlBase = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      
      // Create the redirect URL string directly instead of using URL object
      const loginUrlString = `${loginUrlBase}${loginUrlBase.includes('?') ? '&' : '?'}returnUrl=${encodeURIComponent(returnUrl + '/admin')}`;
      
      console.log('Redirecting to login from layout (no token):', loginUrlString);
      redirect(loginUrlString);
      return null; // This will never execute due to redirect, but helps TypeScript
    }
    
    // Verify token and get user info
    let user = null;
    try {
      user = await verifySharedToken(token);
      console.log('Admin layout - User verified:', !!user);
    } catch (verifyError) {
      console.error('Error verifying token in admin layout:', verifyError);
    }
    
    if (!user) {
      // Invalid token, redirect to login
      const returnUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mosaic.waibooth.app';
      const loginUrlBase = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      
      // Create the redirect URL string directly
      const loginUrlString = `${loginUrlBase}${loginUrlBase.includes('?') ? '&' : '?'}returnUrl=${encodeURIComponent(returnUrl + '/admin')}`;
      
      console.log('Redirecting to login due to invalid token:', loginUrlString);
      redirect(loginUrlString);
      return null;
    }
    
    // Simply render the children without header/layout structure
    return children;
    
  } catch (error) {
    // Catch any unhandled errors in the layout
    console.error('Unhandled error in admin layout:', error);
    
    // Return a minimal fallback UI instead of crashing
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-semibold text-red-600 mb-4">Error loading dashboard</h1>
        <p className="mb-4">An error occurred while loading the dashboard.</p>
        <a href="/api/auth/logout" className="text-blue-600 underline">
          Back to login
        </a>
      </div>
    );
  }
}
