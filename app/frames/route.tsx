import { createFrames, Button } from "frames.js/next";
import { NextRequest } from "next/server";

const frames = createFrames({
  basePath: "/frames",
  initialState: {},
  middleware: [],
  debug: process.env.NODE_ENV === "development",
});

const handleRequest = frames(async (ctx) => {
  const { message, url } = ctx;
  
  // Initial frame - show welcome screen
  if (!message) {
    return {
      image: (
        <div tw="flex flex-col w-full h-full text-white items-center justify-center p-8" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #2563eb)' }}>
          <div tw="flex items-center mb-4">
            <div style={{
              width: '48px',
              height: '96px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1d4ed8 100%)',
              borderRadius: '24px',
              position: 'relative',
              marginRight: '16px'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '36px',
                height: '36px',
                background: 'white',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'linear-gradient(-45deg, transparent 42%, white 50%, transparent 58%)',
                borderRadius: '24px',
                mask: 'radial-gradient(circle 18px at center, transparent 18px, black 18px)'
              }}></div>
            </div>
            <div tw="text-6xl font-bold">OrthoIQ</div>
          </div>
          <div tw="text-3xl mb-6">Ask the Orthopedic AI</div>
          <div tw="text-xl text-center mb-8 max-w-lg">
            Get expert orthopedic and sports medicine insights powered by AI
          </div>
          <div tw="text-lg opacity-80">by KPJMD</div>
          <div tw="absolute bottom-6 text-sm opacity-70 text-center max-w-md px-4">
            ⚠️ This provides educational information only. Always consult a healthcare provider for medical concerns.
          </div>
        </div>
      ),
      buttons: [
        <Button key="ask-question" action="post" target="/question">
          Ask a Question
        </Button>,
      ],
    };
  }
  
  // Handle different button presses
  const buttonPressed = message.buttonIndex;
  
  if (buttonPressed === 1) {
    // Show question input form
    return {
      image: (
        <div tw="flex flex-col w-full h-full bg-white items-center justify-center p-8">
          <div tw="text-5xl mb-4">🏥 Ask Your Question</div>
          <div tw="text-2xl text-center mb-6 text-gray-700 max-w-lg">
            What orthopedic or sports medicine question can I help you with today?
          </div>
          <div tw="text-lg text-center text-gray-600 mb-8 max-w-md">
            Examples: knee pain after running, rotator cuff injury recovery, proper lifting technique
          </div>
        </div>
      ),
      textInput: "Type your orthopedic question here...",
      buttons: [
        <Button key="get-answer" action="post" target="/answer">
          Get AI Answer
        </Button>,
        <Button key="back" action="post" target="/">
          ← Back
        </Button>,
      ],
    };
  }
  
  // Handle question submission and show answer
  if (url.pathname === '/frames/answer') {
    const userQuestion = message.inputText || "No question provided";
    const userFid = message.requesterFid.toString();
    
    try {
      // Call Claude API to get answer
      console.log(`Frame API call - FID: ${userFid}, Question: ${userQuestion.slice(0, 50)}...`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userQuestion,
          fid: userFid
        }),
        // Add timeout for frames
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      console.log(`Frame API response - Status: ${response.status}`);
      
      // Handle non-OK responses before parsing JSON
      if (!response.ok) {
        let errorMessage = `API error (${response.status})`;
        let errorDetails = null;
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            errorDetails = errorData.details;
          } catch (parseError) {
            // Try to get error as text
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch {
              // Use default error message
            }
          }
        } else {
          // Response is not JSON
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // Use default error message
          }
        }
        
        console.error(`Frame API error:`, { status: response.status, error: errorMessage, details: errorDetails });
        throw new Error(errorMessage);
      }
      
      // Only parse JSON if response is OK
      const data = await response.json();
      console.log(`Frame API response parsed successfully`);
      
      const aiAnswer = data.response || "I apologize, but I couldn't generate a response at this time.";
      
      return {
        image: (
          <div tw="flex flex-col w-full h-full bg-white p-6">
            <div tw="flex items-center mb-4">
              <div tw="text-4xl mr-3">🔬</div>
              <div tw="text-3xl font-bold text-blue-800">OrthoIQ Response</div>
            </div>
            <div tw="text-lg font-semibold mb-3 text-gray-800">
              Q: {userQuestion.slice(0, 100)}{userQuestion.length > 100 ? '...' : ''}
            </div>
            <div tw="text-base text-gray-700 leading-tight mb-4">
              {aiAnswer.slice(0, 300)}{aiAnswer.length > 300 ? '...' : ''}
            </div>
            <div tw="absolute bottom-4 text-xs text-gray-500 text-center w-full px-4">
              ⚠️ Educational information only - consult a healthcare provider for medical advice
            </div>
          </div>
        ),
        buttons: [
          <Button key="ask-another" action="post" target="/question">
            Ask Another
          </Button>,
          <Button key="home" action="post" target="/">
            ← Home
          </Button>,
        ],
      };
    } catch (error) {
      console.error('Error getting AI response in frame:', error);
      
      // Determine error type and provide specific messaging
      let errorTitle = "Technical Issue";
      let errorMessage = "I'm experiencing a technical issue. Please try again later.";
      let errorIcon = "⚠️";
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorTitle = "Rate Limit Reached";
          errorMessage = "You've reached your daily question limit (1 per day). Please try again tomorrow.";
          errorIcon = "⏰";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = "Connection Issue";
          errorMessage = "Unable to connect to our AI service. Please check your connection and try again.";
          errorIcon = "🌐";
        } else if (error.message.includes('API') || error.message.includes('Claude')) {
          errorTitle = "AI Service Issue";
          errorMessage = "Our AI service is temporarily unavailable. Please try again in a few minutes.";
          errorIcon = "🤖";
        } else if (error.message.includes('database') || error.message.includes('Database')) {
          errorTitle = "Service Unavailable";
          errorMessage = "Our service is temporarily down for maintenance. Please try again later.";
          errorIcon = "🔧";
        }
      }
      
      return {
        image: (
          <div tw="flex flex-col w-full h-full bg-red-50 items-center justify-center p-6">
            <div tw="text-5xl mb-4">{errorIcon}</div>
            <div tw="text-2xl font-bold text-red-800 mb-4">{errorTitle}</div>
            <div tw="text-lg text-red-700 text-center mb-6 max-w-lg leading-tight">
              {errorMessage}
            </div>
            <div tw="text-sm text-red-600 text-center mb-4">
              If this persists, please contact support
            </div>
            <div tw="text-xs text-gray-500 text-center px-4">
              Error ID: {Math.random().toString(36).substring(7)}
            </div>
          </div>
        ),
        buttons: [
          <Button key="retry" action="post" target="/question">
            Try Again
          </Button>,
          <Button key="back-home" action="post" target="/">
            ← Home
          </Button>,
        ],
      };
    }
  }
  
  // Default fallback to home
  return {
    image: (
      <div tw="flex flex-col w-full h-full text-white items-center justify-center p-8" style={{ background: 'linear-gradient(to bottom right, #1e3a8a, #2563eb)' }}>
        <div tw="flex items-center mb-4">
          <div style={{
            width: '48px',
            height: '96px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1d4ed8 100%)',
            borderRadius: '24px',
            position: 'relative',
            marginRight: '16px'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '36px',
              height: '36px',
              background: 'white',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'linear-gradient(-45deg, transparent 42%, white 50%, transparent 58%)',
              borderRadius: '24px',
              mask: 'radial-gradient(circle 18px at center, transparent 18px, black 18px)'
            }}></div>
          </div>
          <div tw="text-6xl font-bold">OrthoIQ</div>
        </div>
        <div tw="text-3xl mb-6">Ask the Orthopedic AI</div>
        <div tw="text-xl text-center mb-8 max-w-lg">
          Get expert orthopedic and sports medicine insights powered by AI
        </div>
        <div tw="text-lg opacity-80">by KPJMD</div>
      </div>
    ),
    buttons: [
      <Button key="ask-question-final" action="post" target="/question">
        Ask a Question
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;