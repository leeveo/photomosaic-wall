import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Définir les chemins qui doivent être protégés
const PROTECTED_PATHS = ['/admin'];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Vérifier si le chemin doit être protégé
  const isProtectedPath = PROTECTED_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  if (isProtectedPath) {
    // Vérifier si le cookie d'authentification existe
    const authCookie = request.cookies.get('shared_auth_token');
    
    // Console log pour le débogage (visible dans les logs du serveur)
    console.log('Auth cookie:', authCookie?.value ? 'Present' : 'Missing');
    
    // Si aucun cookie d'authentification n'est trouvé
    if (!authCookie?.value) {
      // Rediriger vers la page de connexion de l'application principale
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const redirectUrl = encodeURIComponent(request.url);
      const loginUrl = `${baseUrl}/photobooth-ia/admin/login?redirect=${redirectUrl}`;
      console.log('Redirecting to:', loginUrl);
      return NextResponse.redirect(loginUrl);
    }
    
    // Si nous arrivons ici, le cookie existe - permettre l'accès
    console.log('Authentication cookie found, access granted');
  }
  
  return NextResponse.next();
}

// Assurez-vous que le matcher est correctement configuré pour les deux types de routage
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*'
  ],
};
