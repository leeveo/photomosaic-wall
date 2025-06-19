import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { type NextApiRequest, type NextApiResponse } from 'next';

// Types d'utilisateur pour l'authentification partagée
export interface SharedAuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

// Vérifier un token JWT côté serveur
export function verifyToken(token: string): SharedAuthUser | null {
  try {
    // Utilisez la clé secrète partagée depuis les variables d'environnement
    const secret = process.env.SHARED_AUTH_SECRET;
    if (!secret) {
      console.error('SHARED_AUTH_SECRET is not defined in environment variables');
      return null;
    }

    const decoded = jwt.verify(token, secret) as any;
    return {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Générer un token JWT pour un utilisateur
export function generateToken(user: SharedAuthUser): string {
  const secret = process.env.SHARED_AUTH_SECRET;
  if (!secret) {
    throw new Error('SHARED_AUTH_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    secret,
    { expiresIn: '7d' }
  );
}

// Middleware pour routes d'API avec Next.js API Routes (pages/api)
export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, user: SharedAuthUser) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Vérifier le token dans les cookies
    const token = req.cookies.shared_auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    // Vérifier et décoder le token
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    // Si le token est valide, appeler le gestionnaire avec l'utilisateur
    return handler(req, res, user);
  };
}

// Middleware pour routes d'API avec App Router (app/api)
export async function withAppAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: SharedAuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  // Obtenir le token depuis les cookies
  const cookieStore = cookies();
  const token = cookieStore.get('shared_auth_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
  }

  // Vérifier et décoder le token
  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized - Invalid token' }, { status: 401 });
  }

  // Si le token est valide, appeler le gestionnaire avec l'utilisateur
  return handler(request, user);
}

// Vérifier la session actuelle (pour les API App Router)
export async function getSessionUser(request: NextRequest): Promise<SharedAuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('shared_auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

// Fonction pour les endpoints de validation de token
export async function validateSharedToken(token: string): Promise<SharedAuthUser | null> {
  return verifyToken(token);
}
