import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../utils/sharedAuth';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'utilisateur actuel à partir du cookie
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Retourner les informations de l'utilisateur sans données sensibles
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
