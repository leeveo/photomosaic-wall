import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer un client Supabase avec la clé de service
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  try {
    // Vérifier les variables d'environnement
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Configuration Supabase manquante',
        supabaseUrlPresent: !!supabaseUrl,
        serviceKeyPresent: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    console.log('Récupération des utilisateurs avec la clé de service');
    console.log('Service key JWT payload (si mal formaté, cela échouera):', 
      supabaseServiceKey.includes('.') ? 
        JSON.parse(atob(supabaseServiceKey.split('.')[1])) : 
        'Not a JWT token');
    
    // Créer le client avec la clé de service
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Requête à la table admin_users
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors de la requête admin_users:', error);
      return NextResponse.json({ 
        error: error.message,
        hint: 'Vérifiez que SUPABASE_SERVICE_ROLE_KEY est correct dans .env.local (role, pas rose)'
      }, { status: 500 });
    }
    
    console.log(`Trouvé ${data?.length || 0} utilisateurs dans la table admin_users`);
    
    return NextResponse.json({ 
      users: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('Erreur dans /api/debug/users:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
}
