import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.SHARED_AUTH_SECRET!;

type TokenPayload = {
  userId: string;
  exp: number;
};

type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

export async function verifySharedToken(token: string): Promise<User | null> {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET non configuré');
      return null;
    }
    
    // Vérifier la validité du token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Vérifier que le token n'est pas expiré
    if (Date.now() >= decoded.exp * 1000) {
      return null;
    }
    
    // Récupérer les informations de l'utilisateur depuis la base de données
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Erreur vérification token:', error);
    return null;
  }
}
