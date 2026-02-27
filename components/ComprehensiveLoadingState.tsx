'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { specialistIcons } from './SpecialistBadge';

const specialists = [
  { type: 'movementDetective', message: 'Movement Detective is analyzing your movement patterns' },
  { type: 'painWhisperer', message: 'Pain Whisperer is evaluating your pain profile' },
  { type: 'strengthSage', message: 'Strength Sage is assessing functional capacity' },
  { type: 'mindMender', message: 'Mind Mender is reviewing psychological factors' },
];

const TOTAL_SECONDS = 55;

export default function ComprehensiveLoadingState() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount(prev => Math.min(prev + 1, specialists.length));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => Math.min(prev + 1, TOTAL_SECONDS));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.min((elapsed / TOTAL_SECONDS) * 100, 99);
  const remaining = Math.max(TOTAL_SECONDS - elapsed, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5"
    >
      <h3 className="text-sm font-bold text-gray-700 mb-4">
        Your specialists are reviewing your case...
      </h3>

      <div className="space-y-3 mb-5 min-h-[6rem]">
        <AnimatePresence>
          {specialists.slice(0, visibleCount).map((s) => (
            <motion.div
              key={s.type}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center space-x-3"
            >
              <span className="text-lg">{specialistIcons[s.type]}</span>
              <span className="text-sm text-gray-700 flex-1">{s.message}</span>
              <svg className="animate-spin h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'linear' }}
        />
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Estimated time remaining: ~{remaining}s
      </p>

      <div id="promis-slot" className="mt-4" />

      {visibleCount >= specialists.length && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-indigo-600 font-medium text-center mt-3"
        >
          Building specialist consensus...
        </motion.p>
      )}
    </motion.div>
  );
}
