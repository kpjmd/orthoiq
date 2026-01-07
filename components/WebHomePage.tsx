'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import auth-dependent components with SSR disabled
// This completely prevents hydration mismatch by not rendering on server at all
const AuthSection = dynamic(
  () => import('./AuthSection'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

export default function WebHomePage() {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <div className="medical-gradient text-white p-8 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">OrthoIQ</h1>
          <Link
            href="/stats"
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <span>📊</span>
            <span>Platform Stats</span>
          </Link>
        </div>
        <p className="text-xl mb-2">AI-Powered Orthopedic Intelligence</p>
        <p className="text-lg opacity-90 mb-4">
          5 AI specialists collaborate on your case for comprehensive orthopedic guidance
        </p>

        {/* Key Features Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">🤖</span> 5 AI Specialists
          </span>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">🎯</span> Accuracy-Driven
          </span>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">🪙</span> Token Staking
          </span>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">⚕️</span> MD Reviewed
          </span>
        </div>

        <div className="mt-4">
          <span className="text-sm opacity-80">by Dr. KPJMD, Board-Certified Orthopedic Surgeon</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          How Our AI Panel Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl">
              🏥
            </div>
            <h3 className="font-semibold mb-2">Describe Your Concern</h3>
            <p className="text-gray-600">
              Tell us about your orthopedic issue with details like pain level and duration
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl">
              🤖
            </div>
            <h3 className="font-semibold mb-2">5 Specialists Analyze</h3>
            <p className="text-gray-600">
              Our AI specialists each stake tokens on their predictions, ensuring accountability
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl">
              📊
            </div>
            <h3 className="font-semibold mb-2">Get Consensus Results</h3>
            <p className="text-gray-600">
              Receive a synthesized recommendation backed by specialist agreement scores
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <AuthSection />
      </div>
      
      {/* Key Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 shadow-lg border border-purple-200">
          <h3 className="text-xl font-semibold mb-3 text-purple-900">
            🤖 Self-Learning AI Specialists
          </h3>
          <p className="text-gray-700 mb-3">
            Our panel of 5 AI specialists continuously improves through a prediction market system.
            Each specialist stakes tokens on their recommendations, earning rewards for accurate predictions.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Pain Whisperer</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Movement Detective</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Strength Sage</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Mind Mender</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">OrthoTriage</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-6 shadow-lg border border-amber-200">
          <h3 className="text-xl font-semibold mb-3 text-amber-900">
            🪙 Token-Driven Accuracy
          </h3>
          <p className="text-gray-700 mb-3">
            Unlike typical AI, our specialists put &quot;skin in the game.&quot; They stake tokens on each prediction,
            which are redistributed based on accuracy - creating genuine incentives for quality.
          </p>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Your feedback matters:</strong> When you report outcomes, specialists are rewarded or penalized,
              driving continuous improvement.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">
            📊 Intelligence Cards
          </h3>
          <p className="text-gray-600">
            After each consultation, receive a shareable Intelligence Card showing specialist consensus,
            token stakes, and predictions - a unique record of your AI consultation.
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">
            ⚕️ MD Verification Available
          </h3>
          <p className="text-gray-600">
            High-consensus consultations can be escalated for physician review by Dr. KPJMD,
            a board-certified orthopedic surgeon, adding an extra layer of validation.
          </p>
        </div>
      </div>
      
      <div className="disclaimer-text">
        <strong>Medical Disclaimer:</strong> This AI assistant provides educational information only 
        and should not replace professional medical advice. Always consult with a qualified healthcare 
        provider for medical concerns, diagnosis, or treatment decisions.
      </div>
    </div>
  );
}