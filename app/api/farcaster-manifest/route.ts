import { NextResponse } from 'next/server';

export async function GET() {
  const host = process.env.NEXT_PUBLIC_HOST || 'https://orthoiq.vercel.app';
  const domain = host.replace(/^https?:\/\//, '');
  
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjE1MjMwLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NzgyOTlmZkViQ0ZmN2EwNTQ0RjZmOUUzYUVjZTk3MzlCREZENTA0RiJ9",
      payload: "eyJkb21haW4iOiJhZXF1b3MuaW8ifQ",
      signature: "6D5FN8Zg69U12ztRF7z3W3QGa24Ki0TXqlWEKyxUk+o99EVcWY4wE35+wGu2hZxAokaLj/VtSgJcCo7vH4YufRw="
    },
    miniapp: {
      version: "1",
      name: "AequOs - AI Orthopedic Assistant",
      iconUrl: `${host}/icon.png`,
      splashImageUrl: `${host}/og-image.png`,
      splashBackgroundColor: "#1e3a8a",
      homeUrl: `${host}/miniapp`,
      webhookUrl: `${host}/api/webhook`
    }
  };
  
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}