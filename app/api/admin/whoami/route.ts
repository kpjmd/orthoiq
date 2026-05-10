import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  return NextResponse.json({ authorized: true });
}
