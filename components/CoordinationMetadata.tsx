'use client';

import { motion } from 'framer-motion';

interface CoordinationMetadataProps {
  consultationId?: string;
  specialistCount?: number;
  totalTime?: number;
  networkStatus?: 'active' | 'degraded' | 'error';
  confidence?: number;
  className?: string;
  tokenRewards?: Array<{agent: string; reward: number; accuracy: number}>;
}

export default function CoordinationMetadata({
  consultationId,
  specialistCount = 0,
  totalTime,
  networkStatus = 'active',
  confidence,
  className = "",
  tokenRewards = []
}: CoordinationMetadataProps) {
  const formatTime = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };
  
  const networkStatusConfig = {
    active: {
      icon: '🟢',
      label: 'Network Active',
      color: 'text-green-600'
    },
    degraded: {
      icon: '🟡',
      label: 'Network Degraded',
      color: 'text-yellow-600'
    },
    error: {
      icon: '🔴',
      label: 'Network Error',
      color: 'text-red-600'
    }
  };
  
  const currentStatus = networkStatusConfig[networkStatus];
  
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3
      }
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 ${className}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Consultation ID */}
        {consultationId && (
          <motion.div variants={itemVariants} className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Consultation ID</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200">
                {consultationId.substring(0, 8)}...
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(consultationId)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy full ID"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Specialist Count */}
        <motion.div variants={itemVariants} className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Specialists</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg">👥</span>
            <span className="font-semibold text-gray-900">{specialistCount}</span>
          </div>
        </motion.div>
        
        {/* Response Time */}
        <motion.div variants={itemVariants} className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Response Time</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg">⏱️</span>
            <span className="font-semibold text-gray-900">{formatTime(totalTime)}</span>
          </div>
        </motion.div>
        
        {/* Network Status */}
        <motion.div variants={itemVariants} className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Network</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">{currentStatus.icon}</span>
            <span className={`text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>
        </motion.div>
      </div>
      
      {/* Confidence Score */}
      {confidence !== undefined && (
        <motion.div 
          variants={itemVariants}
          className="mt-4 pt-4 border-t border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Overall Confidence</span>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full ${
                confidence >= 0.8 
                  ? 'bg-gradient-to-r from-green-400 to-green-500' 
                  : confidence >= 0.6 
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }`}
            />
          </div>
        </motion.div>
      )}
      
      {/* Token Distribution Summary */}
      {tokenRewards.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="mt-4 pt-4 border-t border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 flex items-center">
              <span className="mr-1">🪙</span>
              Token Distribution
            </span>
            <span className="text-sm font-semibold text-yellow-700">
              {tokenRewards.reduce((sum, r) => sum + r.reward, 0)} total
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tokenRewards.map((reward, idx) => (
              <motion.div
                key={reward.agent}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200"
              >
                <span className="text-xs font-medium text-gray-700">
                  {reward.agent.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-xs font-bold text-yellow-700">
                  +{reward.reward}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quality Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 flex items-center justify-center"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-medium shadow-md">
          <span>✨</span>
          <span>Premium Multi-Specialist Consultation</span>
        </div>
      </motion.div>
    </motion.div>
  );
}