import { NextRequest, NextResponse } from 'next/server';
import { generateToken, setAuthCookie } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const redirectUrl = searchParams.get('redirect') || '/';

    // Vérifier les paramètres requis
    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Créer l'objet utilisateur
    const user = {
      id: userId,
      email,
      name: name || '',
      role
    };

    // Générer un token
    const token = generateToken(user);

    // Créer une réponse de redirection
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    // Définir le cookie d'authentification
    return setAuthCookie(token, response);
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
