'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TokenReward {
  agent: string;
  reward: number;
  accuracy: number;
}

interface TokenRewardsProps {
  consultationId?: string;
  tokenRewards?: TokenReward[];
  showAnimation?: boolean;
}

const specialistInfo: { [key: string]: { name: string; icon: string; color: string } } = {
  triage: { name: 'Triage Specialist', icon: '🏥', color: 'blue' },
  painWhisperer: { name: 'Pain Whisperer', icon: '💊', color: 'purple' },
  movementDetective: { name: 'Movement Detective', icon: '🔍', color: 'teal' },
  strengthSage: { name: 'Strength Sage', icon: '💪', color: 'orange' },
  mindMender: { name: 'Mind Mender', icon: '🧠', color: 'indigo' }
};

export default function TokenRewards({
  consultationId,
  tokenRewards = [],
  showAnimation = false
}: TokenRewardsProps) {
  const [totalTokens, setTotalTokens] = useState(0);
  const [animatedTokens, setAnimatedTokens] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const total = tokenRewards.reduce((sum, reward) => sum + reward.reward, 0);
    setTotalTokens(total);

    if (showAnimation) {
      let current = 0;
      const increment = total / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= total) {
          setAnimatedTokens(total);
          clearInterval(timer);
        } else {
          setAnimatedTokens(Math.floor(current));
        }
      }, 20);
      return () => clearInterval(timer);
    } else {
      setAnimatedTokens(total);
    }
  }, [tokenRewards, showAnimation]);

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; border: string; text: string } } = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-800' }
    };
    return colors[color] || colors.blue;
  };

  if (tokenRewards.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-300 p-6"
    >
      {/* Header with Total Tokens */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-4xl"
          >
            🪙
          </motion.span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Token Rewards Earned</h3>
            <p className="text-sm text-gray-600">Specialist accuracy-based compensation</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-right"
        >
          <p className="text-sm text-gray-600">Total Earned</p>
          <motion.p
            key={animatedTokens}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-yellow-600"
          >
            {animatedTokens}
          </motion.p>
        </motion.div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mb-4 py-2 px-4 bg-white border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors flex items-center justify-between"
      >
        <span className="font-semibold text-gray-700">
          {isExpanded ? 'Hide' : 'Show'} Specialist Breakdown
        </span>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Specialist Token Distribution */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="space-y-3">
          {tokenRewards.map((reward, index) => {
            const info = specialistInfo[reward.agent] || {
              name: reward.agent,
              icon: '👨‍⚕️',
              color: 'blue'
            };
            const colors = getColorClasses(info.color);

            return (
              <motion.div
                key={reward.agent}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${colors.bg} border-2 ${colors.border} rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h4 className={`font-semibold ${colors.text}`}>{info.name}</h4>
                      <p className="text-xs text-gray-600">
                        Accuracy: {Math.round(reward.accuracy * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                      className={`text-2xl font-bold ${colors.text}`}
                    >
                      +{reward.reward}
                    </motion.p>
                    <p className="text-xs text-gray-600">tokens</p>
                  </div>
                </div>

                {/* Accuracy Bar */}
                <div className="mt-2">
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${reward.accuracy * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                      className={`h-full ${
                        reward.accuracy >= 0.9
                          ? 'bg-green-500'
                          : reward.accuracy >= 0.7
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Token Distribution Chart */}
        <div className="mt-6 p-4 bg-white rounded-lg border-2 border-yellow-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribution Overview</h4>
          <div className="flex items-end space-x-2 h-32">
            {tokenRewards.map((reward, index) => {
              const maxReward = Math.max(...tokenRewards.map(r => r.reward));
              const height = (reward.reward / maxReward) * 100;
              const info = specialistInfo[reward.agent] || { icon: '👨‍⚕️', color: 'blue' };
              const colors = getColorClasses(info.color);

              return (
                <div key={reward.agent} className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.5 }}
                    className={`w-full ${colors.bg} ${colors.border} border-2 rounded-t-lg relative`}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
                      {reward.reward}
                    </div>
                  </motion.div>
                  <p className="text-xs mt-2">{info.icon}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="mr-2">🏆</span>
            Top Contributor
          </h4>
          {tokenRewards.length > 0 && (() => {
            const topSpecialist = [...tokenRewards].sort((a, b) => b.reward - a.reward)[0];
            const info = specialistInfo[topSpecialist.agent] || {
              name: topSpecialist.agent,
              icon: '👨‍⚕️'
            };

            return (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between bg-white p-3 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{info.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900">{info.name}</p>
                    <p className="text-xs text-gray-600">
                      {Math.round(topSpecialist.accuracy * 100)}% accuracy
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">
                    {topSpecialist.reward} tokens
                  </p>
                  <p className="text-xs text-gray-600">
                    {Math.round((topSpecialist.reward / totalTokens) * 100)}% of total
                  </p>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </motion.div>

      {/* Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 pt-4 border-t-2 border-yellow-200"
      >
        <p className="text-xs text-gray-600 text-center">
          💡 Tokens reward specialists based on accuracy and helpfulness. Higher accuracy = more tokens!
        </p>
      </motion.div>
    </motion.div>
  );
}
