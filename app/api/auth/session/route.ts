import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, getCurrentUser } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies
    const token = getAuthToken();
    
    // Si pas de token, retourner un objet vide
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }
    
    // Vérifier si le token est valide et récupérer l'utilisateur
    const user = await getCurrentUser();
    
    // Si le token est invalide ou l'utilisateur n'existe pas
    if (!user) {
      return NextResponse.json({ authenticated: false });
    }
    
    // Retourner les informations de session
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: token  // Inclure le token pour la synchronisation entre applications
    });
  } catch (error) {
    console.error('Erreur de récupération de session:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}
