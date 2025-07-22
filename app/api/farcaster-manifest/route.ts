import { NextResponse } from 'next/server';

export async function GET() {
  const host = process.env.NEXT_PUBLIC_HOST || 'https://orthoiq.vercel.app';
  const domain = host.replace(/^https?:\/\//, '');
  
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjE1MjMwLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NDI0QjM2REM0MmREYjEwZGZlNzVCZjkxODg5NzJlNUQ4Qzk0NzViNSJ9",
      payload: "eyJkb21haW4iOiJvcnRob2lxLnZlcmNlbC5hcHAifQ",
      signature: "MHg4YjRkMTZkY2QyODQ5YTdlY2U5MWY3ODM3OTY4OWEyYzQ3ZTAxZjJhMzQyOWRkYjJlYzE5ZWM3OWQ0MTIxMzJlMDY3ZDA5YjM3MTk2NmM3OWVjZDE5MmI2ZWUxZDkxN2U2OTAzMjJiZjYwZTk4MDgzNGRkMmE1YzYwMTc1OTYwMTFj"
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