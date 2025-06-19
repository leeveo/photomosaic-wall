import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer une connexion directe à Supabase avec les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies
    const token = request.cookies.get('shared_auth_token')?.value;
    
    if (!token) {
      console.log('Aucun token d\'authentification trouvé');
      return NextResponse.json({
        error: 'Non authentifié',
        email: 'user@example.com'
      });
    }
    
    // Extraire l'ID utilisateur du token
    let userId = null;
    
    try {
      // Vérifier si c'est un token JWT (contient des points)
      if (token.includes('.') && token.split('.').length === 3) {
        // Token JWT - extraire le payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || payload.userId;
        console.log('ID utilisateur extrait du JWT:', userId);
      } else {
        // Essayer de décoder comme base64
        const decoded = atob(token);
        const userData = JSON.parse(decoded);
        userId = userData.userId;
        console.log('ID utilisateur extrait du base64:', userId);
      }
    } catch (e) {
      console.error('Erreur lors de l\'extraction des données du token:', e);
    }
    
    if (!userId) {
      console.log('Impossible d\'extraire l\'ID utilisateur du token');
      return NextResponse.json({
        error: 'Token invalide',
        email: 'user@example.com'
      });
    }
    
    // Utiliser la clé anonyme d'abord (plus sûr pour l'API publique)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('Recherche de l\'utilisateur dans admin_users avec ID:', userId);
    
    // Requête directe à la table admin_users
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Erreur lors de la requête à admin_users:', error);
      
      // Tenter une requête sans single() pour éviter l'erreur si plusieurs résultats
      const { data: altData, error: altError } = await supabase
        .from('admin_users')
        .select('id, email, name')
        .eq('id', userId);
      
      if (altError || !altData || altData.length === 0) {
        console.log('Utilisateur non trouvé même avec requête alternative');
        
        // Consulter les utilisateurs disponibles pour le débogage
        const { data: allUsers } = await supabase
          .from('admin_users')
          .select('id, email')
          .limit(10);
          
        console.log('Utilisateurs disponibles:', allUsers);
        
        return NextResponse.json({
          id: userId,
          email: 'user@example.com',
          error: altError ? altError.message : 'Utilisateur non trouvé',
          availableUsers: allUsers?.map(u => ({ id: u.id, email: u.email }))
        });
      }
      
      console.log('Utilisateur trouvé avec requête alternative:', altData[0]);
      
      // Retourner le premier utilisateur trouvé
      return NextResponse.json({
        id: altData[0].id,
        email: altData[0].email,
        name: altData[0].name || 'Utilisateur Admin',
        source: 'database_alt'
      });
    }
    
    if (!data) {
      console.log('Utilisateur non trouvé dans la table admin_users');
      return NextResponse.json({
        id: userId,
        email: 'user@example.com'
      });
    }
    
    console.log('Utilisateur trouvé dans admin_users:', data);
    
    // Retourner l'email de l'utilisateur depuis la base de données
    return NextResponse.json({
      id: data.id,
      email: data.email,
      name: data.name || 'Utilisateur Admin',
      source: 'database'
    });
    
  } catch (error) {
    console.error('Erreur dans /api/users/me:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      email: 'error@example.com'
    });
  }
}
