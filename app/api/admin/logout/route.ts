import { NextResponse } from 'next/server';
import { getAdminCookieDeletionConfig } from '@/lib/adminAuth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookieConfig = getAdminCookieDeletionConfig();
  response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options);
  return response;
}
