'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConsultationProgressBarProps {
  stage: 'instant' | 'coordinating' | 'analyzing' | 'complete';
  specialistCount?: number;
  completedCount?: number;
  estimatedTime?: number;
  className?: string;
  accumulatedTokens?: number;
}

const stageData = {
  instant: {
    label: 'Getting instant response...',
    progress: 25,
    icon: '⚡',
    color: 'bg-blue-500'
  },
  coordinating: {
    label: 'Coordinating specialist review...',
    progress: 50,
    icon: '🔄',
    color: 'bg-purple-500'
  },
  analyzing: {
    label: 'Specialists analyzing case...',
    progress: 75,
    icon: '🔬',
    color: 'bg-indigo-500'
  },
  complete: {
    label: 'Analysis complete',
    progress: 100,
    icon: '✓',
    color: 'bg-green-500'
  }
};

export default function ConsultationProgressBar({
  stage,
  specialistCount = 4,
  completedCount = 0,
  estimatedTime,
  className = "",
  accumulatedTokens = 0
}: ConsultationProgressBarProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const currentStage = stageData[stage];
  
  useEffect(() => {
    if (stage !== 'complete' && estimatedTime) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [stage, estimatedTime]);
  
  const progressPercentage = stage === 'analyzing' && specialistCount > 0
    ? Math.min(50 + (completedCount / specialistCount) * 50, 95)
    : currentStage.progress;
  
  return (
    <div className={`w-full ${className}`}>
      {/* Stage Label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <motion.span
            key={stage}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xl"
          >
            {currentStage.icon}
          </motion.span>
          <motion.span
            key={`label-${stage}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium text-gray-700"
          >
            {currentStage.label}
          </motion.span>
        </div>
        
        {/* Specialist Counter */}
        {stage === 'analyzing' && specialistCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-600"
          >
            {completedCount}/{specialistCount} specialists
          </motion.div>
        )}

        {/* Token Accumulation Counter */}
        {accumulatedTokens > 0 && (stage === 'analyzing' || stage === 'complete') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded-full"
          >
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-xs"
            >
              🪙
            </motion.span>
            <motion.span
              key={accumulatedTokens}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xs font-bold text-yellow-700"
            >
              +{accumulatedTokens}
            </motion.span>
          </motion.div>
        )}

        {/* Timer */}
        {estimatedTime && stage !== 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-500"
          >
            {elapsedTime}s / ~{estimatedTime}s
          </motion.div>
        )}
      </div>
      
      {/* Progress Bar Container */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 0%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear'
            }}
            className="w-full h-full"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
              backgroundSize: '28px 28px'
            }}
          />
        </div>
        
        {/* Progress Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1]
          }}
          className={`absolute left-0 top-0 h-full ${currentStage.color} shadow-sm`}
        >
          {/* Shimmer Effect */}
          {stage !== 'complete' && (
            <motion.div
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              style={{ width: '50%' }}
            />
          )}
        </motion.div>
        
        {/* Pulse Effect at Progress End */}
        {stage !== 'complete' && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className={`absolute h-full w-1 ${currentStage.color} blur-sm`}
            style={{
              left: `${progressPercentage}%`,
              transform: 'translateX(-50%)'
            }}
          />
        )}
      </div>
      
      {/* Stage Indicators */}
      <div className="flex justify-between mt-2">
        {Object.entries(stageData).map(([key, data], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div 
              className={`w-2 h-2 rounded-full ${
                progressPercentage >= data.progress 
                  ? data.color 
                  : 'bg-gray-300'
              } ${
                key === stage && stage !== 'complete' 
                  ? 'animate-pulse' 
                  : ''
              }`}
            />
            <span className="text-xs text-gray-500 mt-1 hidden sm:block">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}