import { cookies } from 'next/headers';
import { verifySharedToken } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase';

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

    if (token) {
      try {
        // Décoder le token base64 pour log l'id utilisateur
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const userData = JSON.parse(decoded);
        const userId = userData.userId;
        console.log('Admin layout - UserId from shared_auth_token:', userId);

        // Récupérer l'email depuis la table admin_users
        if (userId) {
          const { data: user, error } = await supabase
            .from('admin_users')
            .select('email')
            .eq('id', userId)
            .single();

          if (user && user.email) {
            console.log('Admin layout - Email from admin_users:', user.email);
          } else if (error) {
            console.log('Admin layout - Error fetching email:', error.message);
          } else {
            console.log('Admin layout - No email found for userId:', userId);
          }
        }
      } catch (e) {
        console.log('Admin layout - Failed to decode token or fetch email:', e);
      }
    } else {
      console.log('Admin layout - No shared_auth_token found');
    }

    // Simply render the children - middleware already handled auth check
    return children;
  } catch (error) {
    console.error('Unhandled error in admin layout:', error);

    // Always render the children to avoid server errors
    return children;
  }
}
