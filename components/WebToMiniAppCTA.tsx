'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  questionsRemaining: number;
  isHardLimit: boolean; // True when hit 3-question limit
  onDismiss?: () => void;
}

export default function WebToMiniAppCTA({ questionsRemaining, isHardLimit, onDismiss }: Props) {
  const REFERRAL_LINK = 'https://farcaster.xyz/~/code/HPGS71';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${
          isHardLimit
            ? 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-400'
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300'
        } rounded-xl p-6 my-4 relative overflow-hidden`}
      >
        {/* Dismiss button for soft CTA */}
        {!isHardLimit && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center">
          {/* Header */}
          <div className="mb-4">
            {isHardLimit ? (
              <>
                <div className="text-5xl mb-3">🚀</div>
                <h2 className="text-2xl font-bold text-red-900 mb-2">
                  You&apos;ve Hit the Web Limit
                </h2>
                <p className="text-red-700 font-medium">
                  All 3 free web questions used!
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">💡</div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2">
                  Enjoying OrthoIQ?
                </h2>
                <p className="text-blue-700">
                  <span className="font-semibold">{questionsRemaining} question{questionsRemaining !== 1 ? 's' : ''} remaining</span> on web
                </p>
              </>
            )}
          </div>

          {/* Benefits */}
          <div className="bg-white/60 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Get unlimited access with the Farcaster Mini App:
            </p>
            <ul className="space-y-2 text-left">
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✅</span>
                <span className="text-sm text-gray-800">
                  <strong>10 fast consultations</strong> per day
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✅</span>
                <span className="text-sm text-gray-800">
                  <strong>5 comprehensive multi-specialist</strong> consultations
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✅</span>
                <span className="text-sm text-gray-800">
                  <strong>Blockchain-powered notifications</strong> & follow-ups
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✅</span>
                <span className="text-sm text-gray-800">
                  <strong>Prescription NFT artwork</strong> with mint capability
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <a
            href={REFERRAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isHardLimit
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            } text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center space-x-2`}
          >
            <span>Join OrthoIQ on Farcaster</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>

          {/* Additional info for hard limit */}
          {isHardLimit && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-red-600 mt-3"
            >
              Sign up now to continue your orthopedic consultations
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
