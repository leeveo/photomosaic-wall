import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySharedToken } from '@/utils/sharedAuth';
import UserProfileMenu from '@/components/UserProfileMenu';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user info from cookie
  const cookieStore = cookies();
  const token = cookieStore.get('shared_auth_token')?.value;
  
  // If no token, redirect to login
  if (!token) {
    const loginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
    redirect(loginUrl);
  }
  
  // Verify token and get user info
  const user = await verifySharedToken(token);
  
  if (!user) {
    const loginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
    redirect(loginUrl);
  }
  
  const userEmail = user.email || 'utilisateur@example.com';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          
          {/* User Profile Menu */}
          <div>
            <UserProfileMenu email={userEmail} />
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
