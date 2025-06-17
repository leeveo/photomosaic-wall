import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySharedToken } from '../../../utils/sharedAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // On peut récupérer le token soit du body, soit des cookies
  const token = req.body.token || req.cookies.shared_auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    const user = await verifySharedToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Token invalide' });
    }
    
    return res.status(200).json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('Erreur validation token:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
