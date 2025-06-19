import { NextRequest, NextResponse } from 'next/server';
import { setSharedAuthCookie } from '@/utils/sharedAuth';

export async function GET(req: NextRequest) {
  // Récupérer le token et l'URL de redirection depuis les paramètres
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get('token');
  const redirectTo = searchParams.get('redirect') || '/admin';
  
  if (!token) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 400 }
    );
  }
  
  console.log('Callback reçu avec token:', token.substring(0, 10) + '...');
  console.log('Redirection vers:', redirectTo);
  
  // Créer une réponse qui redirige vers la page d'administration
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  
  // Définir le cookie d'authentification
  setSharedAuthCookie(response, token);
  
  return response;
}
