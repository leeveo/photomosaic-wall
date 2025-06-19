import { NextRequest, NextResponse } from 'next/server';
import { verifySharedToken, setSharedAuthCookie } from '@/utils/sharedAuth';

export async function GET(request: NextRequest) {
  // Récupérer le token et l'URL de redirection depuis les paramètres
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  console.log('Callback reçu avec token:', token ? 'présent' : 'absent');
  console.log('Redirection vers:', redirectTo);
  
  // Vérifier si le token est présent
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }
  
  try {
    // Vérifier le token
    const user = await verifySharedToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Définir le cookie d'authentification
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    setSharedAuthCookie(response, token);
    console.log('Cookie auth_token défini avec succès');
    
    // Rediriger vers la page demandée
    return response;
  } catch (error) {
    console.error('Erreur lors de la vérification du token ou de la définition du cookie:', error);
    return NextResponse.redirect(
      new URL('/?error=Erreur serveur lors de l\'authentification', request.url)
    );
  }
}
