import Cookies from 'js-cookie';

// Utilitaires d'authentification côté client
// Sans dépendance sur jsonwebtoken

export function getAuthToken(): string | undefined {
  return Cookies.get('shared_auth_token');
}

export function setAuthToken(token: string, expiresInDays = 7): void {
  Cookies.set('shared_auth_token', token, { expires: expiresInDays });
}

export function removeAuthToken(): void {
  Cookies.remove('shared_auth_token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function redirectToLogin(redirectUrl?: string): void {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const redirect = redirectUrl || window.location.href;
  window.location.href = `${baseUrl}/photobooth-ia/admin/login?redirect=${encodeURIComponent(redirect)}`;
}

export function logout(): void {
  removeAuthToken();
  redirectToLogin();
}
