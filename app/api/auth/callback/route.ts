import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  // Récupérer le token et l'URL de redirection depuis les paramètres
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  console.log('Callback reçu avec token:', token ? 'présent' : 'absent');
  console.log('Redirection vers:', redirectTo);
  
  // Vérifier si le token est présent
  if (!token) {
    return NextResponse.redirect(
      new URL('/?error=Authentification échouée - Token manquant', request.url)
    );
  }
  
  try {
    // Définir le cookie d'authentification
    setAuthCookie(token);
    console.log('Cookie auth_token défini avec succès');
    
    // Rediriger vers la page demandée
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Erreur définition cookie:', error);
    return NextResponse.redirect(
      new URL('/?error=Erreur serveur lors de l\'authentification', request.url)
    );
  }
}
