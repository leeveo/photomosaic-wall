import { NextResponse } from 'next/server';

// Simple health check endpoint to verify the server is running
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
