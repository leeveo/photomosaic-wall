import { cookies } from 'next/headers';
import { verifySharedToken } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | undefined = undefined;
  let userEmail: string | undefined = undefined;
  let tokenSource: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    // Essaye d'abord shared_auth_token, puis admin_session
    const sharedToken = cookieStore.get('shared_auth_token')?.value;
    const adminSessionToken = cookieStore.get('admin_session')?.value;
    const token = sharedToken || adminSessionToken;
    tokenSource = sharedToken ? 'shared_auth_token' : (adminSessionToken ? 'admin_session' : undefined);

    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const userData = JSON.parse(decoded);
        userId = userData.userId;
        userEmail = userData.email;
        if (userId) {
          console.log('[MOSAIC] Admin layout - Token source:', tokenSource);
          console.log('[MOSAIC] Admin layout - UserId from token:', userId);
          if (userEmail) {
            console.log('[MOSAIC] Admin layout - Email from token:', userEmail);
          } else {
            console.log('[MOSAIC] Admin layout - No email in token:', userData);
          }
        } else {
          console.log('[MOSAIC] Admin layout - Token present but userId missing:', userData);
        }
      } catch (e) {
        console.log('[MOSAIC] Admin layout - Failed to decode token:', e);
      }
    } else {
      console.log('[MOSAIC] Admin layout - No shared_auth_token or admin_session found');
    }
  } catch (error) {
    console.log('[MOSAIC] Admin layout - Error reading cookies:', error);
  }

  // Si pas d'userId, refuse l'accès (affiche un message ou rien)
  if (!userId) {
    console.log('[MOSAIC] Admin layout - ACCESS DENIED: No valid userId found in cookie');
    return (
      <div style={{ color: 'red', padding: 32, fontWeight: 'bold', fontSize: 18 }}>
        Accès refusé : utilisateur non authentifié (cookie absent ou invalide)
      </div>
    );
  }

  // Simply render the children - middleware already handled auth check
  return children;
}
