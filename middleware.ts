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
    const hasAuthCookie = request.cookies.has('shared_auth_token');
    
    if (!hasAuthCookie) {
      // Rediriger vers la page de connexion de l'application principale
      const redirectUrl = encodeURIComponent(request.url);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/login?redirect=${redirectUrl}`
      );
    }
  }
  
  return NextResponse.next();
}

// Configurer les chemins sur lesquels le middleware doit s'exécuter
export const config = {
  matcher: [
    '/admin/:path*'
  ],
};
