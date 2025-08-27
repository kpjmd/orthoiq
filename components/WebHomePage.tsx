'use client';

import { useWebAuth } from './WebAuthProvider';
import WebOrthoInterface from './WebOrthoInterface';
import WebSignIn from './WebSignIn';

export default function WebHomePage() {
  const { isAuthenticated } = useWebAuth();

  return (
    <div className="text-center max-w-4xl mx-auto">
      <div className="medical-gradient text-white p-8 rounded-lg mb-8">
        <h1 className="text-4xl font-bold mb-4">OrthoIQ</h1>
        <p className="text-xl mb-4">Ask the Orthopedic AI</p>
        <p className="text-lg opacity-90">
          Get expert orthopedic and sports medicine insights powered by AI
        </p>
        <div className="mt-6">
          <span className="text-sm opacity-80">by Dr. KPJMD</span>
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
              Submit your orthopedic or sports medicine question
            </p>
          </div>
          <div className="text-center">
            <div className="bg-medical-blue-light text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              2
            </div>
            <h3 className="font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600">
              Our Claude AI processes your question with specialized medical knowledge
            </p>
          </div>
          <div className="text-center">
            <div className="bg-medical-blue-light text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              3
            </div>
            <h3 className="font-semibold mb-2">Get Your Answer</h3>
            <p className="text-gray-600">
              Receive a detailed MD-reviewed response with professional medical visuals
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
          {isAuthenticated ? 'Ask OrthoIQ' : 'Get Started'}
        </h2>
        {isAuthenticated ? (
          <WebOrthoInterface className="max-w-2xl mx-auto" />
        ) : (
          <WebSignIn />
        )}
      </div>
      
      {/* Additional Features for Web Users */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">
            🩺 Professional Medical Visuals
          </h3>
          <p className="text-gray-600">
            Every response includes anatomical diagrams, body maps, and recovery timelines - 
            providing practical, educational value.
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">
            ⚕️ Board-Certified Review
          </h3>
          <p className="text-gray-600">
            All responses are reviewed by Dr. KPJMD, a board-certified orthopedic surgeon, 
            ensuring medical accuracy and appropriate disclaimers.
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