import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  // Récupérer le token et l'URL de redirection depuis les paramètres
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const redirectUrl = searchParams.get('redirect') || '/';
  
  console.log('Callback reçu avec token:', token ? 'présent' : 'absent');
  console.log('Redirection vers:', redirectUrl);
  
  // Vérifier si le token est présent
  if (!token) {
    // Rediriger vers la page de connexion si aucun token n'est fourni
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Créer une réponse de redirection
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  
  // Définir le cookie d'authentification
  return setAuthCookie(token, response);
}
