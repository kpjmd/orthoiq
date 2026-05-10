import { NextRequest, NextResponse } from 'next/server';
import { deleteQuestion } from '@/lib/database';
import { requireAdmin } from '@/lib/adminAuth';

export async function DELETE(request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const { questionId } = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    await deleteQuestion(questionId);
    
    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}