'use client';

import { useState } from 'react';
import ResponseCard from './ResponseCard';
import OrthoIQLogo from './OrthoIQLogo';
import Disclaimer from './Disclaimer';

interface OrthoFrameProps {
  className?: string;
}

export default function OrthoFrame({ className = "" }: OrthoFrameProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`frame-container ${className}`}>
      <div className="medical-gradient text-white p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <OrthoIQLogo size="medium" variant="blue" />
          <h1 className="text-3xl font-bold">OrthoIQ</h1>
        </div>
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
            <ResponseCard
              response={response}
              question={question}
              fid="demo-user"
              caseId={`frame-${Date.now()}`}
            />
          </div>
        )}

        <Disclaimer compact className="mt-6" />
      </div>
    </div>
  );
}