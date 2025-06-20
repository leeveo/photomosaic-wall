import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Créer client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Définir le cookie d'authentification partagée
export function setSharedAuthCookie(res: NextResponse, token: string): NextResponse {
  console.log('Définition du cookie d\'authentification partagée');
  
  // Définir le cookie accessible par notre application
  res.cookies.set('shared_auth_token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 1 semaine
  });
  
  // Définir le flag indiquant que l'authentification est dans localStorage
  res.cookies.set('has_auth_in_ls', 'true', {
    path: '/',
    httpOnly: false, // Accessible par JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 1 semaine
  });
  
  return res;
}

// Obtenir les informations utilisateur à partir d'un token
export async function getUserFromToken(token: string) {
  try {
    // Si le token est encodé en base64
    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    const userData = JSON.parse(decodedToken);
    
    // Vérifier si l'utilisateur existe dans la base de données
    if (userData.userId) {
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userData.userId)
        .single();
      
      if (error) {
        console.error('Erreur lors de la recherche de l\'utilisateur:', error);
        return {
          userId: userData.userId,
          email: userData.email || 'email@exemple.com',
          authenticated: true
        };
      }
      
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        authenticated: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du décodage du token:', error);
    return null;
  }
}

// Extraire le token depuis la requête
export function extractTokenFromRequest(req: NextRequest): string | null {
  // Vérifier d'abord le paramètre URL
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }
  
  // Ensuite, vérifier les cookies
  const tokenCookie = req.cookies.get('shared_auth_token')?.value || 
                      req.cookies.get('admin_session')?.value;
  
  if (tokenCookie) {
    return tokenCookie;
  }
  
  return null;
}
