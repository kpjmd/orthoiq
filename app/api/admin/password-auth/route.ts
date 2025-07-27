import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('Password auth: Request received');
    const { password } = await request.json();
    
    // Check for password input
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Get hashed admin password from environment
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    console.log('Password auth: Environment check - password hash configured:', !!adminPasswordHash);
    
    if (!adminPasswordHash) {
      console.error('Password auth: ADMIN_PASSWORD_HASH environment variable not set');
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 500 }
      );
    }
    
    console.log('Password auth: Verifying password hash');
    
    // Use bcrypt to compare the provided password with the stored hash
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
    
    if (isValidPassword) {
      console.log('Password auth: Authentication successful');
      return NextResponse.json({ success: true });
    } else {
      console.log('Password auth: Invalid password provided');
      // Add delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Password auth error:', error);
    // Add delay even on errors to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 1000));
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}