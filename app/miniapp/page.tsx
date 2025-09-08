'use client';

import { useEffect } from 'react';
import OrthoIQLogo from '@/components/OrthoIQLogo';

export default function MiniAppLanding() {
  useEffect(() => {
    // Simple redirect to full mini app after brief delay
    const timer = setTimeout(() => {
      window.location.href = '/mini';
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleEnterApp = () => {
    window.location.href = '/mini';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto p-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <OrthoIQLogo size="large" variant="blue" className="text-white" />
          <h1 className="text-4xl font-bold">OrthoIQ</h1>
        </div>
        
        <p className="text-xl mb-2">AI Orthopedic Expert</p>
        <p className="text-sm opacity-90 mb-6">Get expert orthopedic advice from AI founded by KPJMD</p>
        
        <button
          onClick={handleEnterApp}
          className="bg-white text-blue-900 font-semibold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Enter App
        </button>
        
        <p className="text-xs opacity-60 mt-4">Redirecting automatically...</p>
      </div>
    </div>
  );
}