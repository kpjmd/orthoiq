import { fetchMetadata } from "frames.js/next";
import OrthoFrame from '@/components/OrthoFrame';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_HOST || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  
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
            "url": "https://orthoiq.vercel.app/mini",
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
            "url": "https://orthoiq.vercel.app/mini",
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
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center max-w-4xl mx-auto">
          <div className="medical-gradient text-white p-8 rounded-lg mb-8">
            <h1 className="text-4xl font-bold mb-4">OrthoIQ</h1>
            <p className="text-xl mb-4">Ask the Orthopedic AI</p>
            <p className="text-lg opacity-90">
              Get expert orthopedic and sports medicine insights powered by AI
            </p>
            <div className="mt-6">
              <span className="text-sm opacity-80">by KPJMD</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-medical-blue-light text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">Ask Your Question</h3>
                <p className="text-gray-600">
                  Submit your orthopedic or sports medicine question through the Farcaster frame
                </p>
              </div>
              <div className="text-center">
                <div className="bg-medical-blue-light text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-gray-600">
                  Our AI processes your question using specialized medical knowledge
                </p>
              </div>
              <div className="text-center">
                <div className="bg-medical-blue-light text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">Get Your Answer</h3>
                <p className="text-gray-600">
                  Receive a detailed response with visual artwork and medical insights
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
              Try the Demo
            </h2>
            <OrthoFrame className="max-w-2xl mx-auto" />
          </div>
          
          <div className="disclaimer-text">
            <strong>Medical Disclaimer:</strong> This AI assistant provides educational information only 
            and should not replace professional medical advice. Always consult with a qualified healthcare 
            provider for medical concerns.
          </div>
        </div>
      </div>
      
      {/* Frame detection and redirect script */}
      <Script id="frame-redirect" strategy="afterInteractive">
        {`
          // Enhanced frame detection with origin validation
          function detectAndHandleFrame() {
            try {
              const isInFrame = window !== window.top;
              const currentOrigin = window.location.origin;
              const referrer = document.referrer;
              
              console.log('Frame Detection Debug:');
              console.log('- Is in frame:', isInFrame);
              console.log('- Current origin:', currentOrigin);
              console.log('- Current href:', window.location.href);
              console.log('- Document referrer:', referrer);
              console.log('- Parent available:', window.parent !== window);
              console.log('- Top available:', window.top !== window);
              
              // Check CSP headers for debugging
              fetch(window.location.href, { method: 'HEAD' })
                .then(response => {
                  const csp = response.headers.get('Content-Security-Policy');
                  console.log('- CSP header from main page:', csp);
                })
                .catch(e => console.log('- Could not fetch CSP header:', e.message));
                
              // Also test debug endpoint
              fetch('/api/debug-headers')
                .then(response => {
                  const csp = response.headers.get('Content-Security-Policy');
                  const debugCsp = response.headers.get('X-Debug-CSP');
                  console.log('- Debug endpoint CSP:', csp);
                  console.log('- Debug endpoint X-Debug-CSP:', debugCsp);
                  return response.json();
                })
                .then(data => console.log('- Debug endpoint data:', data))
                .catch(e => console.log('- Debug endpoint error:', e.message));
                
              // Test if we can access our debug endpoint directly
              const testUrl = window.location.origin + '/api/debug-headers';
              console.log('- Testing debug URL:', testUrl);
              
              if (!isInFrame) {
                console.log('Not in frame context, staying on root page');
                return;
              }
              
              // Check if referrer indicates we're in a legitimate Farcaster/Warpcast frame
              const isFarcasterFrame = referrer && (
                referrer.includes('farcaster.xyz') ||
                referrer.includes('warpcast.com') ||
                referrer.includes('client.warpcast.com') ||
                // Handle cases where referrer might be empty but we're clearly in a cross-origin frame
                (referrer !== currentOrigin && referrer !== currentOrigin + '/')
              );
              
              // Additional check: try to determine if this is a same-origin frame (avoid redirect loops)
              const isSameOriginFrame = referrer === currentOrigin || referrer === currentOrigin + '/';
              
              console.log('- Is Farcaster frame:', isFarcasterFrame);
              console.log('- Is same-origin frame:', isSameOriginFrame);
              
              // Only redirect if we're in a frame AND it's likely a Farcaster frame OR referrer is empty (cross-origin)
              if (isInFrame && (isFarcasterFrame || !referrer || referrer === '')) {
                console.log('Redirecting to /mini - detected legitimate frame context');
                window.location.href = '/mini';
              } else if (isInFrame && isSameOriginFrame) {
                console.log('Same-origin frame detected - avoiding redirect loop');
                // Don't redirect if it appears to be a same-origin frame to avoid loops
              } else {
                console.log('Frame context detected but not redirecting - referrer check failed');
              }
              
            } catch (error) {
              console.error('Frame detection error:', error);
              // On error, be conservative and don't redirect
            }
          }
          
          // Run detection immediately and with a small delay for safety
          detectAndHandleFrame();
          
          // Add a fallback check after a short delay in case initial detection was too early
          setTimeout(() => {
            if (window.location.pathname === '/' && window !== window.top) {
              console.log('Fallback frame check triggered');
              detectAndHandleFrame();
            }
          }, 100);
        `}
      </Script>
    </main>
  );
}