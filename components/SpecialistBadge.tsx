'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface SpecialistBadgeProps {
  name: string;
  type: string;
  specialty: string;
  status?: 'pending' | 'active' | 'completed';
  confidence?: number;
  contributionSummary?: string;
  animationDelay?: number;
  tokenReward?: number;
}

const specialistIcons: { [key: string]: string } = {
  'triage': '🏥',
  'painWhisperer': '💊',
  'movementDetective': '🔍',
  'strengthSage': '💪',
  'mindMender': '🧠'
};

const specialistColors: { [key: string]: { bg: string; border: string; text: string; icon: string; status: string } } = {
  'triage': {
    bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-900',
    icon: 'bg-blue-200',
    status: 'bg-blue-500'
  },
  'painWhisperer': {
    bg: 'bg-gradient-to-r from-purple-50 to-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-900',
    icon: 'bg-purple-200',
    status: 'bg-purple-500'
  },
  'movementDetective': {
    bg: 'bg-gradient-to-r from-teal-50 to-teal-100',
    border: 'border-teal-300',
    text: 'text-teal-900',
    icon: 'bg-teal-200',
    status: 'bg-teal-500'
  },
  'strengthSage': {
    bg: 'bg-gradient-to-r from-orange-50 to-orange-100',
    border: 'border-orange-300',
    text: 'text-orange-900',
    icon: 'bg-orange-200',
    status: 'bg-orange-500'
  },
  'mindMender': {
    bg: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
    border: 'border-indigo-300',
    text: 'text-indigo-900',
    icon: 'bg-indigo-200',
    status: 'bg-indigo-500'
  }
};

export default function SpecialistBadge({
  name,
  type,
  specialty,
  status = 'pending',
  confidence,
  contributionSummary,
  animationDelay = 0,
  tokenReward
}: SpecialistBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = specialistColors[type] || specialistColors['triage'];
  const icon = specialistIcons[type] || '👨‍⚕️';
  
  const badgeVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: animationDelay,
        ease: [0.16, 1, 0.3, 1] as const
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2
      }
    }
  };
  
  const statusVariants = {
    pending: { 
      opacity: 0.5,
      scale: 0.8
    },
    active: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        repeat: Infinity,
        repeatType: 'reverse' as const
      }
    },
    completed: { 
      opacity: 1,
      scale: 1
    }
  };
  
  return (
    <motion.div
      variants={badgeVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onClick={() => setIsExpanded(!isExpanded)}
      className={`relative cursor-pointer overflow-hidden rounded-2xl ${colors.bg} ${colors.border} border-2 p-4 shadow-md hover:shadow-lg transition-shadow`}
    >
      {/* Status Indicator */}
      <motion.div
        variants={statusVariants}
        animate={status}
        className="absolute top-2 right-2"
      >
        <div className={`w-2 h-2 rounded-full ${colors.status} ${status === 'active' ? 'animate-pulse' : ''}`} />
      </motion.div>
      
      {/* Main Content */}
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center shadow-inner`}>
          <span className="text-2xl">{icon}</span>
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold ${colors.text} text-sm mb-1 truncate`}>
            {name}
          </h4>
          <p className={`text-xs ${colors.text} opacity-75 truncate`}>
            {specialty}
          </p>
          
          {/* Confidence Indicator */}
          {confidence !== undefined && status === 'completed' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`${colors.text} opacity-60`}>Confidence</span>
                <span className={`font-medium ${colors.text}`}>{Math.round(confidence * 100)}%</span>
              </div>
              <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: 0.8, delay: animationDelay + 0.3 }}
                  className={`h-full ${colors.status} rounded-full`}
                />
              </div>
            </div>
          )}
          
          {/* Status Text */}
          <div className={`mt-2 text-xs ${colors.text} opacity-60`}>
            {status === 'pending' && 'Waiting...'}
            {status === 'active' && 'Analyzing...'}
            {status === 'completed' && '✓ Complete'}
          </div>

          {/* Token Reward Display */}
          {tokenReward !== undefined && tokenReward > 0 && status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: animationDelay + 0.5 }}
              className="mt-2 flex items-center space-x-1"
            >
              <span className="text-yellow-500 text-sm">🪙</span>
              <span className="text-xs font-bold text-yellow-700">+{tokenReward} tokens</span>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: isExpanded && contributionSummary ? 'auto' : 0,
          opacity: isExpanded && contributionSummary ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="mt-3 pt-3 border-t border-opacity-20"
        style={{ borderColor: 'currentColor' }}
      >
        {contributionSummary && (
          <p className={`text-xs ${colors.text} opacity-75 leading-relaxed`}>
            {contributionSummary}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}