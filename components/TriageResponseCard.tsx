'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { specialistIcons } from './SpecialistBadge';

interface TriageResponseCardProps {
  response: string;
  confidence?: number;
  urgencyLevel: 'emergency' | 'urgent' | 'semi-urgent' | 'routine';
  suggestedFollowUp: string[];
  consultationId?: string;
  onSeeFullAnalysis?: () => void;
  onExit?: () => void;
  collapsed?: boolean;
}

const urgencyConfig = {
  emergency: { label: 'EMERGENCY', bg: 'bg-red-600', text: 'text-white', pulse: true, icon: '🚨' },
  urgent: { label: 'URGENT', bg: 'bg-orange-500', text: 'text-white', pulse: true, icon: '⚠️' },
  'semi-urgent': { label: 'SEMI-URGENT', bg: 'bg-amber-400', text: 'text-amber-900', pulse: false, icon: '⚡' },
  routine: { label: 'ROUTINE', bg: 'bg-green-500', text: 'text-white', pulse: false, icon: '✅' },
};

const nonTriageSpecialists = [
  { type: 'movementDetective', name: 'Movement Detective', description: 'Biomechanics and Movement Analysis' },
  { type: 'painWhisperer', name: 'Pain Whisperer', description: 'Pain Management and Assessment' },
  { type: 'strengthSage', name: 'Strength Sage', description: 'Functional Restoration and Rehabilitation' },
  { type: 'mindMender', name: 'Mind Mender', description: 'Psychological Aspects of Recovery' },
];

export default function TriageResponseCard({
  response,
  confidence,
  urgencyLevel,
  suggestedFollowUp,
  onSeeFullAnalysis,
  onExit,
  collapsed = false,
}: TriageResponseCardProps) {
  const urgency = urgencyConfig[urgencyLevel] || urgencyConfig.routine;

  if (collapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-3"
      >
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${urgency.bg} ${urgency.text} shrink-0`}>
          {urgency.icon} {urgency.label}
        </span>
        <span className="text-sm text-gray-600">Triage complete — Full consultation in progress...</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🏥</span>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Triage Assessment</h3>
            <p className="text-xs text-gray-500">OrthoTriage Master</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${urgency.bg} ${urgency.text}${urgency.pulse ? ' animate-pulse' : ''}`}>
            {urgency.icon} {urgency.label}
          </span>
          {confidence !== undefined && (
            <span className="text-xs text-gray-400">{Math.round(confidence * 100)}% confidence</span>
          )}
        </div>
      </div>

      {/* Response body */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
        </div>
      </div>

      {/* Specialist routing preview */}
      <div className="px-4 pb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Based on your case, a full consultation would include:
        </p>
        <div className="space-y-1.5">
          {nonTriageSpecialists.map((s) => (
            <div key={s.type} className="flex items-center space-x-2 text-sm">
              <span>{specialistIcons[s.type]}</span>
              <span className="font-medium text-gray-800">{s.name}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500 text-xs">{s.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up questions */}
      {suggestedFollowUp.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested follow-up</p>
          <ul className="space-y-1">
            {suggestedFollowUp.map((q, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5 border-l-2 border-blue-300"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision CTAs */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
        <button
          onClick={onSeeFullAnalysis}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center space-x-2"
        >
          <span>See Full Analysis</span>
          <span>→</span>
          <span className="text-xs font-normal opacity-80">(~50s)</span>
        </button>
        <div className="text-center">
          <button
            onClick={onExit}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            This answers my question — exit
          </button>
        </div>
      </div>

    </motion.div>
  );
}
