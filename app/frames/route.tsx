import { createFrames, Button } from "frames.js/next";
import { NextRequest } from "next/server";

const frames = createFrames({
  basePath: "/frames",
});

const handleRequest = frames(async (ctx) => {
  const { message, url } = ctx;
  
  // Initial frame - show welcome screen
  if (!message) {
    return {
      image: (
        <div tw="flex flex-col w-full h-full bg-gradient-to-br from-blue-900 to-blue-600 text-white items-center justify-center p-8">
          <div tw="text-6xl font-bold mb-4">🦴 OrthoIQ</div>
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userQuestion,
          fid: userFid
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }
      
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
      console.error('Error getting AI response:', error);
      
      return {
        image: (
          <div tw="flex flex-col w-full h-full bg-red-50 items-center justify-center p-8">
            <div tw="text-5xl mb-4">⚠️</div>
            <div tw="text-2xl font-bold text-red-800 mb-4">Error</div>
            <div tw="text-lg text-red-700 text-center mb-6 max-w-md">
              Sorry, I could not process your question right now. This might be due to rate limiting or a technical issue.
            </div>
            <div tw="text-sm text-red-600">Please try again later</div>
          </div>
        ),
        buttons: [
          <Button key="back-home" action="post" target="/">
            ← Back to Home
          </Button>,
        ],
      };
    }
  }
  
  // Default fallback to home
  return {
    image: (
      <div tw="flex flex-col w-full h-full bg-gradient-to-br from-blue-900 to-blue-600 text-white items-center justify-center p-8">
        <div tw="text-6xl font-bold mb-4">🦴 OrthoIQ</div>
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