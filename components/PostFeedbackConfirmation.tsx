'use client';

import { motion } from 'framer-motion';

interface PostFeedbackConfirmationProps {
  onStartCheckIn?: () => void;
}

export default function PostFeedbackConfirmation({ onStartCheckIn }: PostFeedbackConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 text-center"
    >
      <div className="text-4xl mb-2">🧠</div>
      <h4 className="text-lg font-bold text-green-900 mb-2">Thanks — we got your feedback</h4>
      <p className="text-sm text-green-700 mb-4">
        We'll check in with you in 2 weeks to see how you're doing.
      </p>
      {onStartCheckIn && (
        <button
          onClick={onStartCheckIn}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
        >
          Take your baseline check-in →
        </button>
      )}
    </motion.div>
  );
}
