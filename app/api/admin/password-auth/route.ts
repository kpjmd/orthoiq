import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Password auth: Request received');
    const { password } = await request.json();
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    console.log('Password auth: Environment check - password configured:', !!adminPassword);
    
    if (!adminPassword) {
      console.error('Password auth: ADMIN_PASSWORD environment variable not set');
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      );
    }
    
    console.log('Password auth: Comparing provided password with configured password');
    if (password === adminPassword) {
      console.log('Password auth: Authentication successful');
      return NextResponse.json({ success: true });
    } else {
      console.log('Password auth: Invalid password provided');
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Password auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}