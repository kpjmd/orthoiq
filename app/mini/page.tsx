'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniApp() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Initialize the SDK
        const context = await sdk.context;
        setContext(context);
        setIsSDKLoaded(true);
        
        // Signal that the app is ready
        sdk.actions.ready();
      } catch (err) {
        console.error('Error loading Farcaster SDK:', err);
        setError('Failed to initialize Mini App');
      }
    };

    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !context?.user?.fid) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question.trim(),
          fid: context.user.fid.toString()
        }),
      });

      const contentType = res.headers.get('content-type');
      
      if (!res.ok) {
        let errorMessage = `API error (${res.status})`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          }
        } else {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponse(data.response);
      setQuestion(''); // Clear the question after successful submission
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading OrthoIQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🦴 OrthoIQ</h1>
          <p className="text-lg opacity-90">Ask the Orthopedic AI</p>
          <p className="text-sm mt-2 opacity-75">by KPJMD</p>
          {context?.user && (
            <p className="text-xs mt-2 opacity-60">
              Welcome, {context.user.username || `FID: ${context.user.fid}`}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Question Form */}
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-2xl mr-2">🔬</span>
                OrthoIQ Response:
              </h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Medical Disclaimer</p>
          <p>
            This AI provides educational information only and should not replace professional medical advice. 
            Always consult with a qualified healthcare provider for medical concerns, diagnosis, or treatment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}