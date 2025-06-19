import { NextResponse } from 'next/server';
import { clearSharedAuthCookie } from '@/utils/sharedAuth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSharedAuthCookie(response);
}
