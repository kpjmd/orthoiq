'use client';

import { useState } from 'react';
import ArtworkGenerator from './ArtworkGenerator';
import Disclaimer from './Disclaimer';
import { ArtworkConfig } from '@/lib/types';

interface OrthoFrameProps {
  className?: string;
}

export default function OrthoFrame({ className = "" }: OrthoFrameProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [artwork, setArtwork] = useState<ArtworkConfig['theme']>('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question.trim(),
          fid: 'demo-user' // In real implementation, get from Farcaster auth
        }),
      });

      // Check if response is ok before trying to parse JSON
      if (!res.ok) {
        // Try to get error message from response
        let errorMessage = `API error (${res.status})`;
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If JSON parsing fails, try to get text
            try {
              const errorText = await res.text();
              errorMessage = errorText || errorMessage;
            } catch {
              // Use default error message
            }
          }
        } else {
          // Response is not JSON, try to get as text
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // Use default error message
          }
        }
        
        throw new Error(errorMessage);
      }

      // Only parse as JSON if response is ok
      const data = await res.json();

      setResponse(data.response);
      
      // Set artwork theme based on question content
      const lowerQuestion = question.toLowerCase();
      if (lowerQuestion.includes('bone') || lowerQuestion.includes('fracture') || lowerQuestion.includes('break')) {
        setArtwork('bone');
      } else if (lowerQuestion.includes('muscle') || lowerQuestion.includes('strain') || lowerQuestion.includes('tear')) {
        setArtwork('muscle');
      } else if (lowerQuestion.includes('joint') || lowerQuestion.includes('knee') || lowerQuestion.includes('shoulder')) {
        setArtwork('joint');
      } else {
        setArtwork('general');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`frame-container ${className}`}>
      <div className="medical-gradient text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">🦴 OrthoIQ</h1>
        <p className="text-lg opacity-90">Ask the Orthopedic AI</p>
        <p className="text-sm mt-2 opacity-75">by KPJMD</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              What orthopedic question can I help you with?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What should I do for knee pain after running?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-blue-light focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="medical-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting AI Response...
              </span>
            ) : (
              'Get AI Answer'
            )}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {response && (
          <div className="mb-6">
            <div className="flex items-start space-x-4 mb-4">
              <ArtworkGenerator 
                question={question} 
                theme={artwork} 
                size={120} 
                className="flex-shrink-0" 
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">OrthoIQ Response:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Disclaimer compact className="mt-6" />
      </div>
    </div>
  );
}