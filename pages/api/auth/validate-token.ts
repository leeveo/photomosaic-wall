import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySharedToken } from '../../../utils/sharedAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier si la méthode est POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Valider le token
    const user = verifySharedToken(token);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Si le token est valide, retourner les informations de l'utilisateur
    return res.status(200).json({ valid: true, user });
  } catch (error) {
    console.error('Error validating token:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
