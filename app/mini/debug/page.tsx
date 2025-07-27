'use client';

import { useEffect, useState } from 'react';

export default function MiniAppDebug() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/mini/health');
        const data = await response.json();
        setHealthData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load health data');
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🦴 OrthoIQ Mini App Debug
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Health Check</h2>
          
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                healthData?.status === 'healthy' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${
                  healthData?.status === 'healthy' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Status: {healthData?.status}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Required Environment Variables</h3>
                  <div className="space-y-1">
                    {healthData?.environment?.required?.present?.map((env: string) => (
                      <div key={env} className="flex items-center text-sm">
                        <span className="text-green-600 mr-2">✓</span>
                        <span className="text-gray-700">{env}</span>
                      </div>
                    ))}
                    {healthData?.environment?.required?.missing?.map((env: string) => (
                      <div key={env} className="flex items-center text-sm">
                        <span className="text-red-600 mr-2">✗</span>
                        <span className="text-gray-700">{env}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Optional Environment Variables</h3>
                  <div className="space-y-1">
                    {Object.entries(healthData?.environment?.optional || {}).map(([env, present]) => (
                      <div key={env} className="flex items-center text-sm">
                        <span className={`mr-2 ${present ? 'text-green-600' : 'text-gray-400'}`}>
                          {present ? '✓' : '○'}
                        </span>
                        <span className="text-gray-700">{env}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Configuration</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Host:</strong> {healthData?.host}</p>
                  <p><strong>Environment:</strong> {healthData?.isProduction ? 'Production' : 'Development'}</p>
                  <p><strong>Timestamp:</strong> {healthData?.timestamp}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Direct Mini App Access</h2>
          <p className="text-gray-600 mb-4">
            If this page loads correctly, the Mini App route is working. 
            Issues may be specific to the Farcaster SDK or framing context.
          </p>
          <div className="space-y-2">
            <p className="text-sm"><strong>Mini App URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/mini</code></p>
            <p className="text-sm"><strong>Debug URL:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/mini/debug</code></p>
            <p className="text-sm"><strong>Health Check:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/api/mini/health</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}