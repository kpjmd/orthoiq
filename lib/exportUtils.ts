import { PrescriptionData, PrescriptionMetadata } from './types';

export interface ExportOptions {
  format: 'png' | 'svg' | 'instagram' | 'linkedin' | 'twitter' | 'farcaster';
  quality?: number;
  width?: number;
  height?: number;
}

export async function downloadAsPNG(svgElement: SVGSVGElement, filename: string = 'prescription', quality: number = 1): Promise<void> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Cannot create canvas context');
    }

    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const scaleFactor = 2; // For high DPI
    
    canvas.width = svgRect.width * scaleFactor;
    canvas.height = svgRect.height * scaleFactor;
    
    // Scale context for high DPI
    ctx.scale(scaleFactor, scaleFactor);
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Download as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }
      }, 'image/png', quality);
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw error;
  }
}

export async function downloadAsSVG(svgElement: SVGSVGElement, filename: string = 'prescription'): Promise<void> {
  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting SVG:', error);
    throw error;
  }
}

export function generateInstagramStoryFormat(
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata
): string {
  // Generate Instagram story format (1080x1920)
  return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${metadata.theme.primaryColor}20" />
          <stop offset="100%" stop-color="${metadata.theme.accentColor}20" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1080" height="1920" fill="url(#ig-bg)" />
      
      <!-- Header -->
      <rect x="60" y="100" width="960" height="200" fill="white" rx="20" />
      <text x="540" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${metadata.theme.primaryColor}">
        OrthoIQ Medical Intelligence
      </text>
      <text x="540" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${metadata.theme.accentColor}">
        AI-Powered Orthopedic Insights
      </text>
      
      <!-- Main Content -->
      <rect x="60" y="350" width="960" height="1200" fill="white" rx="20" />
      <text x="120" y="420" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#374151">
        Prescription Generated
      </text>
      
      <!-- Rarity Badge -->
      <rect x="120" y="460" width="200" height="50" fill="${metadata.theme.primaryColor}20" rx="25" />
      <text x="220" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${metadata.theme.primaryColor}">
        ${metadata.rarity.toUpperCase().replace('-', ' ')}
      </text>
      
      <!-- Question Preview -->
      <text x="120" y="560" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#4b5563">
        Question:
      </text>
      <text x="120" y="590" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">
        ${prescriptionData.userQuestion.substring(0, 100)}...
      </text>
      
      <!-- Call to Action -->
      <rect x="120" y="1700" width="840" height="100" fill="${metadata.theme.primaryColor}" rx="50" />
      <text x="540" y="1760" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">
        Get Your OrthoIQ Prescription
      </text>
      
      <!-- Footer -->
      <text x="540" y="1850" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
        orthoiq.com • AI-Powered Medical Intelligence
      </text>
    </svg>
  `;
}

export function generateLinkedInPost(
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata
): string {
  // Generate LinkedIn post format (1200x627)
  return `
    <svg width="1200" height="627" viewBox="0 0 1200 627" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ln-bg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${metadata.theme.primaryColor}15" />
          <stop offset="100%" stop-color="${metadata.theme.accentColor}15" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="627" fill="url(#ln-bg)" />
      
      <!-- Main Content Card -->
      <rect x="50" y="50" width="1100" height="527" fill="white" rx="15" stroke="#e5e7eb" stroke-width="2" />
      
      <!-- Header -->
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${metadata.theme.primaryColor}">
        OrthoIQ Medical Intelligence
      </text>
      <text x="100" y="155" font-family="Arial, sans-serif" font-size="20" fill="${metadata.theme.accentColor}">
        Professional AI-Generated Medical Prescription
      </text>
      
      <!-- Left Column -->
      <text x="100" y="220" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#374151">
        Patient Case:
      </text>
      <text x="100" y="250" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
        ${prescriptionData.userQuestion.substring(0, 120)}...
      </text>
      
      <text x="100" y="300" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#374151">
        AI Analysis Complete
      </text>
      <text x="100" y="330" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
        Confidence: ${Math.round(prescriptionData.confidence * 100)}%
      </text>
      
      <!-- Right Column -->
      <rect x="650" y="200" width="450" height="250" fill="${metadata.theme.primaryColor}10" rx="10" />
      <text x="875" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${metadata.theme.primaryColor}">
        ${metadata.rarity.toUpperCase().replace('-', ' ')}
      </text>
      <text x="875" y="270" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${metadata.theme.accentColor}">
        Prescription Generated
      </text>
      
      <!-- Footer -->
      <rect x="100" y="500" width="1000" height="50" fill="${metadata.theme.primaryColor}" rx="25" />
      <text x="600" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">
        Experience AI-Powered Orthopedic Care at orthoiq.com
      </text>
    </svg>
  `;
}

export function generateTwitterCard(
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata
): string {
  // Generate Twitter card format (1200x675)
  return `
    <svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tw-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${metadata.theme.primaryColor}20" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="675" fill="url(#tw-bg)" />
      
      <!-- Main Card -->
      <rect x="50" y="50" width="1100" height="575" fill="white" rx="20" stroke="#e5e7eb" stroke-width="3" />
      
      <!-- Header -->
      <text x="600" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${metadata.theme.primaryColor}">
        OrthoIQ
      </text>
      <text x="600" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${metadata.theme.accentColor}">
        AI-Powered Medical Intelligence
      </text>
      
      <!-- Content -->
      <text x="100" y="280" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#374151">
        Just generated a medical prescription:
      </text>
      <text x="100" y="320" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">
        "${prescriptionData.userQuestion.substring(0, 80)}..."
      </text>
      
      <!-- Stats -->
      <rect x="100" y="370" width="200" height="80" fill="${metadata.theme.primaryColor}15" rx="10" />
      <text x="200" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${metadata.theme.primaryColor}">
        ${Math.round(prescriptionData.confidence * 100)}%
      </text>
      <text x="200" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
        AI Confidence
      </text>
      
      <rect x="350" y="370" width="200" height="80" fill="${metadata.theme.accentColor}15" rx="10" />
      <text x="450" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${metadata.theme.accentColor}">
        ${metadata.rarity.replace('-', ' ').toUpperCase()}
      </text>
      <text x="450" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
        Rarity Level
      </text>
      
      <!-- CTA -->
      <text x="600" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#374151">
        Get your AI prescription at orthoiq.com
      </text>
      
      <!-- Footer -->
      <text x="600" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
        #OrthoIQ #AIHealthcare #OrthopedicCare #MedicalAI
      </text>
    </svg>
  `;
}

export function generateFarcasterFrame(
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata
): string {
  // Generate Farcaster frame format (1.91:1 aspect ratio)
  return `
    <svg width="1200" height="628" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${metadata.theme.primaryColor}25" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${metadata.theme.accentColor}25" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="628" fill="url(#fc-bg)" />
      
      <!-- Main Card -->
      <rect x="40" y="40" width="1120" height="548" fill="white" rx="25" stroke="#e5e7eb" stroke-width="2" />
      
      <!-- Header with Farcaster purple accent -->
      <rect x="60" y="60" width="1080" height="120" fill="linear-gradient(45deg, #8A63D2, #472A91)" rx="15" />
      <text x="600" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white">
        🩺 OrthoIQ Prescription Generated
      </text>
      <text x="600" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)">
        AI-Powered Medical Intelligence on Farcaster
      </text>
      
      <!-- Content Preview -->
      <text x="100" y="230" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#374151">
        Medical Inquiry:
      </text>
      <text x="100" y="260" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
        ${prescriptionData.userQuestion.substring(0, 100)}...
      </text>
      
      <!-- Stats Row -->
      <rect x="100" y="300" width="150" height="70" fill="${metadata.theme.primaryColor}15" rx="10" />
      <text x="175" y="325" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${metadata.theme.primaryColor}">
        ${Math.round(prescriptionData.confidence * 100)}%
      </text>
      <text x="175" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        AI Confidence
      </text>
      
      <rect x="280" y="300" width="200" height="70" fill="${metadata.theme.accentColor}15" rx="10" />
      <text x="380" y="325" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${metadata.theme.accentColor}">
        ${metadata.rarity.replace('-', ' ').toUpperCase()}
      </text>
      <text x="380" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        Rarity Level
      </text>
      
      <rect x="510" y="300" width="180" height="70" fill="#10b98115" rx="10" />
      <text x="600" y="325" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#10b981">
        ID: ${metadata.id.substring(0, 12)}...
      </text>
      <text x="600" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        Prescription ID
      </text>
      
      <!-- CTA -->
      <rect x="200" y="420" width="800" height="80" fill="#8A63D2" rx="40" />
      <text x="600" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white">
        🚀 Ask Your Own Question on OrthoIQ
      </text>
      
      <!-- Footer -->
      <text x="600" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
        Powered by Claude AI • Reviewed by Board Certified MDs
      </text>
    </svg>
  `;
}

export function generateNFTMetadata(
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata,
  mdReviewed: boolean = false,
  mdReviewerName?: string
): object {
  // Calculate rarity percentage
  const rarityPercentages = {
    'common': 70,
    'uncommon': 20,
    'rare': 8,
    'ultra-rare': 2
  };
  
  // Generate NFT-compatible metadata following ERC-721 standard
  return {
    name: `OrthoIQ Prescription #${metadata.id}`,
    description: `${mdReviewed ? 'MD-Reviewed ' : ''}AI-generated orthopedic prescription: "${prescriptionData.userQuestion.substring(0, 150)}..." Generated with ${Math.round(prescriptionData.confidence * 100)}% AI confidence${mdReviewed ? ` and reviewed by ${mdReviewerName || 'Dr. KPJMD'}` : ''}.`,
    image: `https://orthoiq.com/api/prescription-image/${metadata.id}`,
    external_url: `https://orthoiq.com/prescription/${metadata.id}`,
    animation_url: metadata.rarity === 'ultra-rare' ? `https://orthoiq.com/api/prescription-animation/${metadata.id}` : undefined,
    attributes: [
      {
        trait_type: "Rarity",
        value: metadata.rarity.replace('-', ' ').toUpperCase()
      },
      {
        trait_type: "Rarity Percentage",
        value: rarityPercentages[metadata.rarity as keyof typeof rarityPercentages],
        max_value: 100
      },
      {
        trait_type: "AI Confidence",
        value: Math.round(prescriptionData.confidence * 100),
        max_value: 100
      },
      {
        trait_type: "Theme Color",
        value: metadata.theme.logoVariant.toUpperCase()
      },
      {
        trait_type: "MD Reviewed",
        value: mdReviewed ? "Yes" : "No"
      },
      ...(mdReviewed ? [{
        trait_type: "Reviewing Physician",
        value: mdReviewerName || "Dr. KPJMD"
      }] : []),
      {
        trait_type: "Watermark Type",
        value: metadata.rarity === 'common' ? 'None' : 
               metadata.rarity === 'uncommon' ? 'Medical Pattern' :
               metadata.rarity === 'rare' ? 'Gold Caduceus' : 'Holographic'
      },
      {
        trait_type: "Generation Date",
        value: new Date(metadata.generatedAt).toISOString().split('T')[0]
      },
      {
        trait_type: "Patient ID",
        value: metadata.patientId
      },
      {
        trait_type: "Verification Hash",
        value: metadata.verificationHash
      },
      {
        trait_type: "Specialty Focus",
        value: "Orthopedic Surgery"
      }
    ],
    properties: {
      category: "Medical AI",
      collection: "OrthoIQ Prescriptions",
      creator: "OrthoIQ AI System",
      medical_disclaimer: "This is AI-generated information for educational purposes only. Always consult with a healthcare provider.",
      mint_status: mdReviewed ? "ready_to_mint" : "not_minted",
      blockchain: "Base",
      royalty_percentage: 5,
      utility: mdReviewed ? "Premium medical analysis with physician review" : "AI-powered medical analysis"
    }
  };
}

// Helper function to detect if we're in a mini app environment
async function isMiniAppEnvironment(): Promise<boolean> {
  try {
    // First check the global flag set by layout.tsx
    if (window.__ORTHOIQ_MINI_APP__) {
      console.log('Mini app detected via global flag');
      return true;
    }
    
    // Try to use Farcaster SDK if available
    if (window.__FARCASTER_SDK__) {
      try {
        const isInMiniApp = await window.__FARCASTER_SDK__.isInMiniApp();
        console.log('Mini app detected via Farcaster SDK:', isInMiniApp);
        if (isInMiniApp) return true;
      } catch (sdkError) {
        console.warn('Farcaster SDK check failed:', sdkError);
      }
    }
    
    // Fallback to heuristic detection
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    
    // Check if we're in a frame (common in mini apps)
    const isInFrame = window !== window.top;
    
    // Check for Farcaster-specific indicators
    const isFarcasterFrame = referrer && (
      referrer.includes('farcaster.xyz') ||
      referrer.includes('warpcast.com') ||
      referrer.includes('client.warpcast.com') ||
      referrer.includes('miniapps.farcaster.xyz')
    );
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasMiniAppParam = urlParams.get('miniApp') === 'true';
    
    // Check if we're on a mini app path
    const isMiniAppPath = window.location.pathname.startsWith('/mini') || window.location.pathname.startsWith('/miniapp');
    
    const isHeuristicMiniApp = isInFrame && (isFarcasterFrame || hasMiniAppParam || isMiniAppPath);
    console.log('Mini app heuristic detection:', isHeuristicMiniApp);
    
    return isHeuristicMiniApp;
  } catch (error) {
    console.warn('Error detecting mini app environment:', error);
    return false;
  }
}

export async function copyPrescriptionAsImage(svgElement: SVGSVGElement): Promise<void> {
  const isMiniApp = await isMiniAppEnvironment();
  console.log('Copy Image: Mini app environment detected:', isMiniApp);
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Cannot create canvas context');
    }

    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const scaleFactor = 2; // For high DPI
    
    canvas.width = svgRect.width * scaleFactor;
    canvas.height = svgRect.height * scaleFactor;
    
    // Scale context for high DPI
    ctx.scale(scaleFactor, scaleFactor);
    
    // Clean SVG data to prevent taint issues
    let svgData = new XMLSerializer().serializeToString(svgElement);
    
    // Ensure all styles are embedded and no external resources
    svgData = svgData.replace(/href="[^"]*"/g, ''); // Remove external href links
    svgData = svgData.replace(/<image[^>]*>/g, ''); // Remove external images
    
    // Create data URL directly instead of blob to avoid cross-origin issues
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    
    // Create image and copy to clipboard
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Prevent taint issues
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          // Clear canvas with white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width / scaleFactor, canvas.height / scaleFactor);
          
          ctx.drawImage(img, 0, 0);
          
          // Mini app specific handling
          if (isMiniApp) {
            console.log('Using mini app compatible image copy method');
            
            // Method 1: Try Web Share API first (most compatible with mini apps)
            if (navigator.share) {
              try {
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    try {
                      const file = new File([blob], 'orthoiq-prescription.png', { type: 'image/png' });
                      await navigator.share({
                        files: [file],
                        title: 'OrthoIQ Prescription',
                        text: 'My OrthoIQ medical prescription'
                      });
                      console.log('Successfully shared image via Web Share API');
                      resolve();
                    } catch (shareError) {
                      console.warn('Web Share API failed:', shareError);
                      // Continue to next method
                      tryNextMiniAppMethod();
                    }
                  } else {
                    tryNextMiniAppMethod();
                  }
                }, 'image/png', 0.95);
                return;
              } catch (shareSetupError) {
                console.warn('Web Share API setup failed:', shareSetupError);
              }
            }
            
            // Method 2: Try copying as data URL text
            async function tryNextMiniAppMethod() {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                  const imageDataUrl = canvas.toDataURL('image/png', 0.95);
                  await navigator.clipboard.writeText(imageDataUrl);
                  console.log('Successfully copied image as data URL to clipboard');
                  resolve();
                  return;
                } catch (textError) {
                  console.warn('Text clipboard fallback failed in mini app:', textError);
                }
              }
              
              // Method 3: Download the image as last resort
              try {
                canvas.toBlob((blob) => {
                  if (blob) {
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = `orthoiq-prescription-${Date.now()}.png`;
                    
                    // For mini apps, trigger download
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(downloadUrl);
                    
                    console.log('Image downloaded as fallback in mini app');
                    resolve();
                  } else {
                    console.error('All mini app methods failed');
                    reject(new Error('Unable to copy or share image in mini app environment. All methods failed.'));
                  }
                }, 'image/png', 0.95);
              } catch (downloadError) {
                console.error('Download fallback failed:', downloadError);
                reject(new Error('Unable to copy or share image in mini app environment. Download failed.'));
              }
            }
            
            // Start with the fallback method if Web Share API isn't available
            if (!navigator.share) {
              tryNextMiniAppMethod();
            }
            
            return; // Exit early for mini app handling
          }
          
          // Standard web app handling
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && navigator.clipboard.write) {
              try {
                // Try modern Clipboard API first
                const clipboardItem = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([clipboardItem]);
                console.log('Successfully copied image using Clipboard API');
                resolve();
              } catch (clipboardError) {
                console.warn('Modern clipboard failed, trying fallbacks:', clipboardError);
                
                // Fallback 1: Copy as data URL text
                try {
                  const imageDataUrl = canvas.toDataURL('image/png', 0.95);
                  await navigator.clipboard.writeText(imageDataUrl);
                  console.log('Successfully copied image as data URL');
                  resolve();
                } catch (textError) {
                  console.warn('Text clipboard fallback also failed:', textError);
                  
                  // Fallback 2: Manual copy instruction
                  const imageDataUrl = canvas.toDataURL('image/png', 0.95);
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head><title>OrthoIQ Prescription</title></head>
                        <body style="margin:0;text-align:center;background:#f0f0f0;">
                          <h3>Right-click the image below and select "Copy Image"</h3>
                          <img src="${imageDataUrl}" style="max-width:100%;margin:20px;" alt="OrthoIQ Prescription" />
                        </body>
                      </html>
                    `);
                    newWindow.document.close();
                    resolve();
                  } else {
                    reject(new Error('All clipboard methods failed'));
                  }
                }
              }
            } else {
              reject(new Error('Clipboard API not available'));
            }
          }, 'image/png', 0.95);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = dataUrl;
    });
  } catch (error) {
    console.error('Error copying prescription as image:', error);
    throw error;
  }
}

export async function exportPrescription(
  svgElement: SVGSVGElement,
  prescriptionData: PrescriptionData,
  metadata: PrescriptionMetadata,
  options: ExportOptions
): Promise<void> {
  switch (options.format) {
    case 'png':
      await downloadAsPNG(svgElement, `orthoiq-prescription-${metadata.id}`, options.quality || 1);
      break;
      
    case 'svg':
      await downloadAsSVG(svgElement, `orthoiq-prescription-${metadata.id}`);
      break;
      
    case 'instagram':
      const igContent = generateInstagramStoryFormat(prescriptionData, metadata);
      const igBlob = new Blob([igContent], { type: 'image/svg+xml' });
      const igUrl = URL.createObjectURL(igBlob);
      const igLink = document.createElement('a');
      igLink.href = igUrl;
      igLink.download = `orthoiq-instagram-${metadata.id}.svg`;
      igLink.click();
      URL.revokeObjectURL(igUrl);
      break;
      
    case 'linkedin':
      const lnContent = generateLinkedInPost(prescriptionData, metadata);
      const lnBlob = new Blob([lnContent], { type: 'image/svg+xml' });
      const lnUrl = URL.createObjectURL(lnBlob);
      const lnLink = document.createElement('a');
      lnLink.href = lnUrl;
      lnLink.download = `orthoiq-linkedin-${metadata.id}.svg`;
      lnLink.click();
      URL.revokeObjectURL(lnUrl);
      break;
      
    case 'twitter':
      const twContent = generateTwitterCard(prescriptionData, metadata);
      const twBlob = new Blob([twContent], { type: 'image/svg+xml' });
      const twUrl = URL.createObjectURL(twBlob);
      const twLink = document.createElement('a');
      twLink.href = twUrl;
      twLink.download = `orthoiq-twitter-${metadata.id}.svg`;
      twLink.click();
      URL.revokeObjectURL(twUrl);
      break;
      
    case 'farcaster':
      const fcContent = generateFarcasterFrame(prescriptionData, metadata);
      const fcBlob = new Blob([fcContent], { type: 'image/svg+xml' });
      const fcUrl = URL.createObjectURL(fcBlob);
      const fcLink = document.createElement('a');
      fcLink.href = fcUrl;
      fcLink.download = `orthoiq-farcaster-${metadata.id}.svg`;
      fcLink.click();
      URL.revokeObjectURL(fcUrl);
      break;
      
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}