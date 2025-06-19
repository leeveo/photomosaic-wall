import { NextRequest, NextResponse } from 'next/server';
import { verifySharedToken } from '../../../../utils/sharedAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token manquant' 
      }, { status: 400 });
    }
    
    const user = await verifySharedToken(token);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token invalide ou expiré' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur vérification token:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erreur serveur' 
    }, { status: 500 });
  }
}
