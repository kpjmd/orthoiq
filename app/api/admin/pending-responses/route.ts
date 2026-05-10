import { NextRequest, NextResponse } from 'next/server';
import { getPendingResponses } from '@/lib/database';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    // In a real app, you'd verify admin authentication here
    const responses = await getPendingResponses();
    
    return NextResponse.json({
      success: true,
      responses
    });

  } catch (error) {
    console.error('Error fetching pending responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending responses' },
      { status: 500 }
    );
  }
}