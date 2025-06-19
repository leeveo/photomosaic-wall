import { NextRequest, NextResponse } from 'next/server';
import { generateAuthToken, setAuthCookie } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token de session de l'application principale
    const mainAppToken = request.headers.get('x-auth-token');
    
    if (!mainAppToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Aucun token fourni' 
      }, { status: 401 });
    }
    
    // Vérifier si le token est au format JWT valide
    // Cette vérification est basique, la vérification complète
    // est faite dans verifySharedToken
    const tokenParts = mainAppToken.split('.');
    if (tokenParts.length !== 3) {
      return NextResponse.json({ 
        success: false, 
        message: 'Format de token invalide' 
      }, { status: 401 });
    }
    
    try {
      // Si le token est valide, le définir comme cookie pour cette application
      setAuthCookie(mainAppToken);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Session synchronisée' 
      });
    } catch (error) {
      console.error('Erreur lors de la définition du cookie:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Erreur de synchronisation de session' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur vérification session:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erreur serveur' 
    }, { status: 500 });
  }
}
