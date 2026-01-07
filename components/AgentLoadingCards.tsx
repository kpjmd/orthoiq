'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface Agent {
  name: string;
  type: string;
  specialty: string;
  baseStake: number;
  color: string;
  icon: string;
}

const SPECIALISTS: Agent[] = [
  {
    name: 'OrthoTriage Master',
    type: 'triage',
    specialty: 'Case Coordination',
    baseStake: 5.0,
    color: 'from-blue-500 to-blue-600',
    icon: '🏥'
  },
  {
    name: 'Pain Whisperer',
    type: 'painWhisperer',
    specialty: 'Pain Management',
    baseStake: 6.5,
    color: 'from-purple-500 to-purple-600',
    icon: '💫'
  },
  {
    name: 'Movement Detective',
    type: 'movementDetective',
    specialty: 'Biomechanics',
    baseStake: 5.8,
    color: 'from-green-500 to-green-600',
    icon: '🔍'
  },
  {
    name: 'Strength Sage',
    type: 'strengthSage',
    specialty: 'Rehabilitation',
    baseStake: 6.2,
    color: 'from-amber-500 to-amber-600',
    icon: '💪'
  },
  {
    name: 'Mind Mender',
    type: 'mindMender',
    specialty: 'Recovery Psychology',
    baseStake: 4.5,
    color: 'from-red-500 to-red-600',
    icon: '🧠'
  }
];

interface AgentLoadingCardsProps {
  isLoading: boolean;
  mode: 'fast' | 'normal';
  onComplete?: () => void;
}

export default function AgentLoadingCards({ isLoading, mode }: AgentLoadingCardsProps) {
  const [visibleAgents, setVisibleAgents] = useState<number[]>([]);
  const [analyzingAgents, setAnalyzingAgents] = useState<number[]>([]);
  const [totalStake, setTotalStake] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Get agents based on mode
  const agents = mode === 'fast' ? [SPECIALISTS[0]] : SPECIALISTS;

  // Clear all timeouts
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  };

  // Reset all state
  const resetState = () => {
    setVisibleAgents([]);
    setAnalyzingAgents([]);
    setTotalStake(0);
    setAllRevealed(false);
  };

  useEffect(() => {
    // Clear timeouts and reset state when loading changes
    clearAllTimeouts();
    resetState();

    if (!isLoading) {
      return;
    }

    // Progressive reveal of agents - they stay in "Analyzing" state until response arrives
    const revealInterval = mode === 'fast' ? 500 : 1200;
    const analyzeDelay = mode === 'fast' ? 800 : 1000;

    agents.forEach((agent, index) => {
      // Reveal agent card
      const revealTimeout = setTimeout(() => {
        setVisibleAgents(prev => {
          if (prev.includes(index)) return prev;
          return [...prev, index];
        });
      }, index * revealInterval);
      timeoutRefs.current.push(revealTimeout);

      // Start analyzing (agents stay in this state until response arrives)
      const analyzeTimeout = setTimeout(() => {
        setAnalyzingAgents(prev => {
          if (prev.includes(index)) return prev;
          return [...prev, index];
        });
        setTotalStake(prev => {
          const newStake = agents.slice(0, index + 1).reduce((sum, a) => sum + a.baseStake, 0);
          return newStake;
        });

        // Mark all revealed after last agent starts analyzing
        if (index === agents.length - 1) {
          setAllRevealed(true);
        }
      }, index * revealInterval + analyzeDelay);
      timeoutRefs.current.push(analyzeTimeout);
    });

    return () => {
      clearAllTimeouts();
    };
  }, [isLoading, mode]);

  if (!isLoading) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-2xl"
          >
            {mode === 'fast' ? '⚡' : '🏥'}
          </motion.div>
          <div>
            <h3 className="text-white font-bold text-lg">
              {mode === 'fast' ? 'Fast Triage' : 'Multi-Specialist Consultation'}
            </h3>
            <p className="text-slate-400 text-sm">
              {mode === 'fast'
                ? 'Getting rapid assessment...'
                : 'Agents staking predictions...'}
            </p>
          </div>
        </div>

        {/* Token Counter */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-4 py-2 rounded-full border border-yellow-500/30"
        >
          <motion.span
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xl"
          >
            🪙
          </motion.span>
          <div className="text-right">
            <motion.span
              key={totalStake}
              initial={{ scale: 1.3, color: '#fbbf24' }}
              animate={{ scale: 1, color: '#fef08a' }}
              className="font-bold text-yellow-300"
            >
              {totalStake.toFixed(1)}
            </motion.span>
            <span className="text-yellow-500/70 text-sm ml-1">staked</span>
          </div>
        </motion.div>
      </div>

      {/* Agent Cards Grid */}
      <div className={`grid ${mode === 'fast' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-4`}>
        <AnimatePresence>
          {agents.map((agent, index) => {
            const isVisible = visibleAgents.includes(index);
            const isAnalyzing = analyzingAgents.includes(index);

            if (!isVisible) return null;

            return (
              <motion.div
                key={agent.type}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.4,
                  type: 'spring',
                  stiffness: 200
                }}
                className="relative rounded-lg border border-purple-500/50 bg-slate-800/50 overflow-hidden"
              >
                {/* Analyzing shimmer effect - continuous while loading */}
                {isAnalyzing && (
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                )}

                <div className="relative p-3">
                  <div className="flex items-center gap-2">
                    {/* Agent Icon */}
                    <motion.div
                      animate={isAnalyzing ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-base shadow-lg shrink-0`}
                    >
                      {agent.icon}
                    </motion.div>

                    {/* Name and Status */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-xs truncate">{agent.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isAnalyzing ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="text-purple-400 text-xs"
                            >
                              ◌
                            </motion.span>
                            <span className="text-purple-400 text-xs">Analyzing</span>
                            <span className="text-yellow-400 text-xs">🪙 {agent.baseStake.toFixed(1)}</span>
                          </>
                        ) : (
                          <span className="text-slate-500 text-xs">{agent.specialty}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar - continuous animation */}
                  {isAnalyzing && (
                    <div className="mt-2">
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: ['0%', '70%', '40%', '85%', '60%', '75%'] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${agent.color}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Status - shows "Building consensus" once all agents are revealed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center"
      >
        <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {allRevealed ? '✨' : '⏳'}
          </motion.div>
          <span>
            {allRevealed
              ? 'Building consensus...'
              : `${analyzingAgents.length} of ${agents.length} specialists analyzing`
            }
          </span>
        </div>

        {/* Additional status message for long waits */}
        {allRevealed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-xs text-slate-500 mt-2"
          >
            Synthesizing specialist recommendations...
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
