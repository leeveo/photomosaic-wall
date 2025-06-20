import { cookies } from 'next/headers';
import { verifySharedToken } from '@/utils/sharedAuth';
import { supabase } from '@/lib/supabase';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('shared_auth_token')?.value;

    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const userData = JSON.parse(decoded);
        if (userData.email) {
          email = userData.email;
          // Log côté serveur pour debug
          console.log('Admin layout - Email from shared_auth_token:', email);
        } else {
          console.log('Admin layout - No email in token:', userData);
        }
      } catch (e) {
        console.log('Admin layout - Failed to decode token:', e);
      }
    } else {
      console.log('Admin layout - No shared_auth_token found');
    }
  } catch (error) {
    console.log('Admin layout - Error:', error);
  }

  return (
    <>
      {email && (
        <div style={{ background: '#222', color: '#fff', padding: '8px 16px', fontSize: 14 }}>
          Utilisateur connecté :{' '}
          <span style={{ fontWeight: 'bold' }}>{email}</span>
        </div>
      )}
      {children}
    </>
  );
}
