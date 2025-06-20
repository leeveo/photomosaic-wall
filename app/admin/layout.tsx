import { cookies } from 'next/headers';
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
    
    // Simply render the children - middleware already handled auth check
    return children;
    
  } catch (error) {
    console.error('Unhandled error in admin layout:', error);
    
    // Always render the children to avoid server errors
    return children;
  }
}
