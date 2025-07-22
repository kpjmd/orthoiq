import { fetchMetadata } from "frames.js/next";
import OrthoFrame from '@/components/OrthoFrame';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return {
    title: "OrthoIQ - Ask the Orthopedic AI",
    description: "AI assistant for orthopedic and sports medicine questions",
    other: {
      ...(await fetchMetadata(
        new URL(
          "/frames",
          process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000"
        )
      )),
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
    </main>
  );
}