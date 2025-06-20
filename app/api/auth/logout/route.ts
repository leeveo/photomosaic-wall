import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Supprime le cookie d'authentification et redirige vers la page d'accueil
  const response = NextResponse.redirect(new URL('/', req.url));
  response.cookies.set({
    name: 'shared_auth_token',
    value: '',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: 'admin_session',
    value: '',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: 'has_auth_in_ls',
    value: '',
    path: '/',
    maxAge: 0,
  });
  return response;
}
