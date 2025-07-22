import { NextResponse } from 'next/server';

export async function GET() {
  const host = process.env.NEXT_PUBLIC_HOST || 'https://orthoiq.vercel.app';
  const domain = host.replace(/^https?:\/\//, '');
  
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjE2MTUzLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZTMzMWVhNzk3MjFmNmQ5NTYwYzM5YTJhNzQ4Y2NjNGI0YjgwOGRlNjQ4ZmJjZGQ0MTczNGY0YWI4MjJmNmNhNCJ9",
      payload: `eyJkb21haW4iOiIke Buffer.from(JSON.stringify({ domain })).toString('base64')}"}`,
      signature: "MHhlMzMxZWE3OTcyMWY2ZDk1NjBjMzlhMmE3NDhjY2M0YjRiODA4ZGU2NDhmYmNkZDQxNzM0ZjRhYjgyMmY2Y2E0"
    },
    frame: {
      version: "1",
      name: "OrthoIQ - Orthopedic AI Assistant",
      iconUrl: `${host}/icon.png`,
      splashImageUrl: `${host}/og-image.png`,
      splashBackgroundColor: "#1e3a8a",
      homeUrl: `${host}/frames`,
      webhookUrl: `${host}/api/webhook`
    }
  };
  
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}