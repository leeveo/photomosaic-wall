import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/sharedAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier si la méthode est GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Récupérer le token depuis les cookies
    const token = req.cookies.shared_auth_token;
    
    console.log('API check-token called, token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ authenticated: false, message: 'No token found' });
    }
    
    // Vérifier le token localement
    const user = verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ authenticated: false, message: 'Invalid token' });
    }
    
    // Si le token est valide, retourner les informations de l'utilisateur
    return res.status(200).json({ authenticated: true, user });
  } catch (error) {
    console.error('Error validating token:', error);
    return res.status(500).json({ authenticated: false, message: 'Error validating token' });
  }
}
