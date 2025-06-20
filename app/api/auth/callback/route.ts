// Correction: ce fichier doit exporter une fonction route valide, même si elle ne fait rien.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Redirige simplement vers /auth-success (ou une page de succès)
  return NextResponse.redirect(new URL('/auth-success', req.url));
}