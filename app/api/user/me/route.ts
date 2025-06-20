import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, getUserFromToken } from '@/lib/sharedAuth';

export async function GET(req: NextRequest) {
  try {
    // Extraire le token d'authentification
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      return NextResponse.json({
        email: 'utilisateur@exemple.com',
        authenticated: false,
        error: 'Aucun token trouvé'
      }, { status: 401 });
    }
    
    // Obtenir les informations utilisateur à partir du token
    const userData = await getUserFromToken(token);
    
    if (!userData) {
      return NextResponse.json({
        email: 'utilisateur@exemple.com',
        authenticated: false,
        error: 'Token invalide'
      }, { status: 401 });
    }
    
    // Retourner les informations utilisateur
    return NextResponse.json({
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      authenticated: true
    });
  } catch (error) {
    console.error('Erreur dans l\'API user/me:', error);
    return NextResponse.json({
      email: 'utilisateur@exemple.com',
      authenticated: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}
