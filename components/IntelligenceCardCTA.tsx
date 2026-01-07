'use client';

import { motion } from 'framer-motion';

interface IntelligenceCardCTAProps {
  onVerifyEmail: () => void;
}

export default function IntelligenceCardCTA({ onVerifyEmail }: IntelligenceCardCTAProps) {
  const FARCASTER_REFERRAL = 'https://farcaster.xyz/~/code/HPGS71';
  const BASEAPP_REFERRAL = 'https://base.app/invite/friends/D1KBCSXG';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔒</div>
        <h3 className="text-xl font-bold text-purple-900 mb-2">
          Unlock Your Intelligence Card
        </h3>
        <p className="text-purple-700 text-sm">
          Get personalized AI specialist insights with agent predictions and consensus data
        </p>
      </div>

      {/* Value proposition */}
      <div className="bg-white/60 rounded-lg p-4 mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Your Intelligence Card includes:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-purple-600 mr-2 mt-0.5">✨</span>
            <span className="text-sm text-gray-800">
              <strong>Agent predictions</strong> with confidence stakes
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2 mt-0.5">✨</span>
            <span className="text-sm text-gray-800">
              <strong>Multi-specialist consensus</strong> analysis
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2 mt-0.5">✨</span>
            <span className="text-sm text-gray-800">
              <strong>QR tracking code</strong> for milestone updates
            </span>
          </li>
        </ul>
      </div>

      {/* Primary CTA - Email verification */}
      <div className="mb-4">
        <button
          onClick={onVerifyEmail}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-[1.02] shadow-md"
        >
          <span className="mr-2">📧</span>
          Verify Email for Extended Access
        </button>
        <p className="text-xs text-purple-600 text-center mt-2">
          Get 10 consultations/day with email verification
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center my-4">
        <div className="flex-1 border-t border-purple-200"></div>
        <span className="px-3 text-xs text-purple-500 font-medium">OR</span>
        <div className="flex-1 border-t border-purple-200"></div>
      </div>

      {/* Platform CTAs */}
      <div className="space-y-3 mb-5">
        <p className="text-sm font-semibold text-gray-900 text-center mb-2">
          Get unlimited access via our mini apps:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={FARCASTER_REFERRAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-2.5 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg transition-all group"
          >
            <span className="text-lg mr-2">🟣</span>
            <span className="text-sm font-medium text-purple-900 group-hover:text-purple-700">
              Farcaster
            </span>
          </a>
          <a
            href={BASEAPP_REFERRAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-2.5 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg transition-all group"
          >
            <span className="text-lg mr-2">🔵</span>
            <span className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
              BaseApp
            </span>
          </a>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Unlimited consultations + full Intelligence Card features
        </p>
      </div>

      {/* Return daily message */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3 mb-3">
        <div className="flex items-start">
          <span className="text-amber-600 mr-2">💡</span>
          <div>
            <p className="text-sm text-amber-900 font-medium">
              Enjoyed your trial?
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Return daily for more questions while exploring OrthoIQ
            </p>
          </div>
        </div>
      </div>

      {/* Share prompt */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Found OrthoIQ helpful? <span className="text-purple-600 font-medium">Please share with others!</span>
        </p>
      </div>
    </motion.div>
  );
}
