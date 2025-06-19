import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.shared_auth_token;
  
  console.log('API check-token called, token present:', !!token);
  
  if (!token) {
    return res.status(401).json({ authenticated: false, message: 'No token found' });
  }
  
  try {
    // Vérifier le token avec l'application principale
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/validate-shared-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      return res.status(401).json({ authenticated: false, message: 'Invalid token' });
    }
    
    const data = await response.json();
    return res.status(200).json({ authenticated: true, user: data.user });
  } catch (error) {
    console.error('Error validating token:', error);
    return res.status(500).json({ authenticated: false, message: 'Error validating token' });
  }
}
