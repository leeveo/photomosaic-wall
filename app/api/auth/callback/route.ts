import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Obtenir le token des paramètres de l'URL
    const token = req.nextUrl.searchParams.get('token');
    console.log('Auth callback received token:', !!token, 'Length:', token?.length);
    
    if (!token) {
      console.error('No token in callback');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Obtenir l'URL de retour des paramètres (maintenant pointe vers notre page auth-success)
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/auth-success';

    // Créer l'URL cible avec le token
    const targetUrl = new URL(returnUrl, req.url);
    targetUrl.searchParams.set('token', token);
    
    console.log('Redirecting to:', targetUrl.toString());
    
    // Redirection simple vers la page auth-success avec le token dans l'URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth-redirect?error=callback_failed', req.url));
  }
}
