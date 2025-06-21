import { cookies } from 'next/headers';
import { verifySharedToken } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    // Essaye d'abord shared_auth_token, puis admin_session
    const token = cookieStore.get('shared_auth_token')?.value || cookieStore.get('admin_session')?.value;

    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const userData = JSON.parse(decoded);
        userId = userData.userId;
        if (userId) {
          console.log('Admin layout - UserId from token:', userId);
        } else {
          console.log('Admin layout - Token present but userId missing:', userData);
        }
      } catch (e) {
        console.log('Admin layout - Failed to decode token:', e);
      }
    } else {
      console.log('Admin layout - No shared_auth_token or admin_session found');
    }
  } catch (error) {
    console.log('Admin layout - Error reading cookies:', error);
  }

  // Si pas d'userId, refuse l'accès (affiche un message ou rien)
  if (!userId) {
    console.log('Admin layout - ACCESS DENIED: No valid userId found in cookie');
    return (
      <div style={{ color: 'red', padding: 32, fontWeight: 'bold', fontSize: 18 }}>
        Accès refusé : utilisateur non authentifié (cookie absent ou invalide)
      </div>
    );
  }

  // Simply render the children - middleware already handled auth check
  return children;
}
