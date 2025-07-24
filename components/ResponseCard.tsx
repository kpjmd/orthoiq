'use client';

import { useState } from 'react';

interface ResponseCardProps {
  response: string;
  confidence?: number;
  isFiltered?: boolean;
  isPendingReview?: boolean;
  isApproved?: boolean;
  reviewedBy?: string;
  reviewType?: string;
  hasAdditions?: boolean;
  hasCorrections?: boolean;
  additionsText?: string;
  correctionsText?: string;
}

export default function ResponseCard({ 
  response, 
  confidence, 
  isFiltered = false,
  isPendingReview = false,
  isApproved = false,
  reviewedBy,
  reviewType,
  hasAdditions = false,
  hasCorrections = false,
  additionsText,
  correctionsText
}: ResponseCardProps) {
  const [showConfidence, setShowConfidence] = useState(false);

  // Parse JSON response if it's still in JSON format
  let displayResponse = response;
  try {
    const parsed = JSON.parse(response);
    if (parsed.response) {
      displayResponse = parsed.response;
    }
  } catch {
    // Not JSON, use as-is
  }

  const getStatusBadge = () => {
    if (isFiltered) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <span className="mr-1">🔍</span>
          Content Filtered
        </div>
      );
    }
    
    if (isApproved && reviewedBy && reviewType) {
      // Enhanced review status badges
      if (reviewType === 'approve_as_is') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="mr-1">✅</span>
            Medically reviewed and approved
          </div>
        );
      }
      
      if (reviewType === 'approve_with_additions') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <span className="mr-1">✅➕</span>
            Doctor reviewed with additions
          </div>
        );
      }
      
      if (reviewType === 'approve_with_corrections') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <span className="mr-1">✅✏️</span>
            Doctor reviewed with corrections
          </div>
        );
      }
    }
    
    // Legacy approval (fallback)
    if (isApproved && reviewedBy) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="mr-1">✅</span>
          Dr. {reviewedBy} approved
        </div>
      );
    }
    
    if (isPendingReview) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <span className="mr-1">⏳</span>
          Pending medical review
        </div>
      );
    }
    
    return null;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🔬</span>
          <h3 className="text-lg font-semibold text-gray-800">OrthoIQ Response</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          
          {confidence !== undefined && (
            <button
              onClick={() => setShowConfidence(!showConfidence)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              ⓘ Confidence
            </button>
          )}
        </div>
      </div>
      
      {/* Confidence Display */}
      {showConfidence && confidence !== undefined && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">AI Confidence Level:</span>
            <span className={`font-medium ${getConfidenceColor(confidence)}`}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Response Content */}
      <div className="p-6">
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {hasCorrections && correctionsText ? correctionsText : displayResponse}
          </div>
        </div>
        
        {/* Doctor's Additions */}
        {hasAdditions && additionsText && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-blue-600 text-sm font-medium">👨‍⚕️ Doctor's Additional Information:</span>
            </div>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {additionsText}
            </div>
          </div>
        )}
      </div>
      
      {/* Medical Disclaimer */}
      {!isFiltered && (
        <div className="px-4 py-3 bg-yellow-50 border-t">
          <p className="text-xs text-yellow-800">
            <span className="font-medium">⚠️ Medical Disclaimer:</span> This AI provides educational information only. 
            Always consult with a qualified healthcare provider for medical concerns.
          </p>
        </div>
      )}
    </div>
  );
}