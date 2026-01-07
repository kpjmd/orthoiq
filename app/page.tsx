import { fetchMetadata } from "frames.js/next";
import { WebAuthProvider } from '@/components/WebAuthProvider';
import WebHomePage from '@/components/WebHomePage';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_HOST || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_HOST || "http://localhost:3001");
  
  let frameMetadata = {};
  try {
    frameMetadata = await fetchMetadata(new URL("/frames", baseUrl));
  } catch (error) {
    console.warn("Failed to fetch frame metadata:", error);
    // Provide fallback frame metadata
    frameMetadata = {
      "fc:frame": "vNext",
      "fc:frame:image": `${baseUrl}/og-image.png`,
      "fc:frame:button:1": "Ask Question",
      "fc:frame:post_url": `${baseUrl}/frames`,
    };
  }
                  
  return {
    title: "OrthoIQ - Ask the Orthopedic AI",
    description: "AI assistant for orthopedic and sports medicine questions",
    openGraph: {
      title: "OrthoIQ - Ask the Orthopedic AI",
      description: "AI assistant for orthopedic and sports medicine questions",
      url: baseUrl,
      siteName: "OrthoIQ",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "OrthoIQ - Ask the Orthopedic AI",
      description: "AI assistant for orthopedic and sports medicine questions",
      images: [`${baseUrl}/og-image.png`],
    },
    other: {
      ...frameMetadata,
      // Farcaster Mini App embed metadata for shareability
      "fc:miniapp": JSON.stringify({
        "version": "1",
        "imageUrl": "https://orthoiq.vercel.app/embed-image.png",
        "button": {
          "title": "Ask OrthoIQ",
          "action": {
            "type": "launch_frame",
            "name": "OrthoIQ",
            "url": "https://orthoiq.vercel.app/miniapp",
            "splashImageUrl": "https://orthoiq.vercel.app/splash-image.png",
            "splashBackgroundColor": "#1e3a8a"
          }
        }
      }),
      // Backward compatibility
      "fc:frame": JSON.stringify({
        "version": "1",
        "imageUrl": "https://orthoiq.vercel.app/embed-image.png",
        "button": {
          "title": "Ask OrthoIQ",
          "action": {
            "type": "launch_frame",
            "name": "OrthoIQ",
            "url": "https://orthoiq.vercel.app/miniapp",
            "splashImageUrl": "https://orthoiq.vercel.app/splash-image.png",
            "splashBackgroundColor": "#1e3a8a"
          }
        }
      }),
    },
  };
}


export default function HomePage() {
  return (
    <WebAuthProvider>
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <WebHomePage />
        </div>
      
      {/* Frame detection and redirect script */}
      <Script id="frame-redirect" strategy="afterInteractive">
        {`
          // Enhanced Mini App detection with proper SDK integration
          function detectAndHandleMiniApp() {
            try {
              const url = new URL(window.location.href);
              const isInFrame = window !== window.top;
              const referrer = document.referrer;
              const isMiniAppParam = url.searchParams.get('miniApp') === 'true';
              
              console.log('Mini App Detection Debug:');
              console.log('- Is in frame:', isInFrame);
              console.log('- Has miniApp param:', isMiniAppParam);
              console.log('- Current href:', window.location.href);
              console.log('- Document referrer:', referrer);
              
              // Check if we're already flagged as a Mini App context
              const isMiniAppContext = (window.__ORTHOIQ_MINI_APP__ || false) || isMiniAppParam;
              
              if (isMiniAppContext) {
                console.log('Mini App context detected, ensuring proper SDK initialization');
                return; // Don't redirect if already in Mini App mode
              }
              
              if (!isInFrame) {
                console.log('Not in frame context, staying on root page');
                return;
              }
              
              // Check if referrer indicates Farcaster/Warpcast frame
              const isFarcasterFrame = referrer && (
                referrer.includes('farcaster.xyz') ||
                referrer.includes('warpcast.com') ||
                referrer.includes('client.warpcast.com') ||
                referrer.includes('miniapps.farcaster.xyz')
              );
              
              console.log('- Is Farcaster frame:', isFarcasterFrame);
              
              // For Mini Apps, use isInMiniApp() if SDK is available
              if (window.__FARCASTER_SDK__) {
                console.log('SDK available, checking isInMiniApp()...');
                window.__FARCASTER_SDK__.isInMiniApp().then(function(inMiniApp) {
                  console.log('- SDK isInMiniApp result:', inMiniApp);
                  if (inMiniApp && window.location.pathname === '/') {
                    console.log('SDK confirmed Mini App context, redirecting to /miniapp');
                    window.location.href = '/miniapp?miniApp=true';
                  }
                }).catch(function(err) {
                  console.error('SDK isInMiniApp check failed:', err);
                  // Fallback to frame detection
                  if (isInFrame && (isFarcasterFrame || !referrer)) {
                    console.log('Fallback: redirecting to /miniapp based on frame detection');
                    window.location.href = '/miniapp?miniApp=true';
                  }
                });
              } else if (isInFrame && (isFarcasterFrame || !referrer)) {
                console.log('No SDK available, using frame detection for redirect');
                window.location.href = '/miniapp?miniApp=true';
              }
              
            } catch (error) {
              console.error('Mini App detection error:', error);
            }
          }
          
          // Run detection immediately and with a small delay for safety
          detectAndHandleMiniApp();
          
          // Add a fallback check after a short delay in case initial detection was too early
          setTimeout(() => {
            if (window.location.pathname === '/' && window !== window.top) {
              console.log('Fallback Mini App check triggered');
              detectAndHandleMiniApp();
            }
          }, 500);
        `}
      </Script>
      </main>
    </WebAuthProvider>
  );
}