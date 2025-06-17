import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySharedToken } from '../../../utils/sharedAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token manquant' });
    }
    
    // Vérifier le token et récupérer l'utilisateur
    const user = await verifySharedToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    
    // Retourner les informations de l'utilisateur (sans données sensibles)
    return res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur validation token:', error);
    return res.status(500).json({ error: 'Erreur de validation du token' });
  }
}
