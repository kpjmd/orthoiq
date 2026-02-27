'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/lib/types';

const MAX_MESSAGE_LENGTH = 1000;

interface ConsultationChatbotProps {
  consultationId: string;
  consultationContext: { response: string; rawConsultationData?: any };
  specialistContext: 'triage';
  userQuestion: string;
  fid: string;
  suggestedFollowUp?: string[];
  messageLimit?: number;
}

export default function ConsultationChatbot({
  consultationId,
  consultationContext,
  specialistContext,
  userQuestion,
  fid,
  suggestedFollowUp = [],
  messageLimit = 5,
}: ConsultationChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const buildConsultationData = (): string => {
    const parts: string[] = [];
    if (userQuestion) {
      parts.push(`Original question: ${userQuestion}`);
    }
    if (consultationContext.response) {
      parts.push(`Consultation response: ${consultationContext.response}`);
    }
    if (consultationContext.rawConsultationData) {
      try {
        const raw = typeof consultationContext.rawConsultationData === 'string'
          ? consultationContext.rawConsultationData
          : JSON.stringify(consultationContext.rawConsultationData);
        parts.push(`Raw data: ${raw}`);
      } catch {
        // Skip if serialization fails
      }
    }
    return parts.join('\n\n');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || limitReached) return;

    const userMessage: ChatMessage = { role: 'user', content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          message: content.trim(),
          fid,
          specialistContext,
          consultationData: buildConsultationData(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) {
          setLimitReached(true);
          setUserMessageCount(messageLimit);
          return;
        }
        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setUserMessageCount(data.messageCount);
      setLimitReached(data.limitReached);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      // Remove the failed user message and restore input
      setMessages((prev) => prev.slice(0, -1));
      setInputValue(content.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleStarterClick = (question: string) => {
    // Pre-fill the input so the user can type their answer in context
    setInputValue(`Regarding "${question}": `);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const remainingMessages = messageLimit - userMessageCount;
  const showStarters = suggestedFollowUp.length > 0 && messages.length === 0;

  return (
    <div className="mt-4">
      {/* Toggle button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setIsOpen(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-all flex items-center justify-center space-x-2 text-sm font-medium text-blue-700"
        >
          <span>💬</span>
          <span>Have a follow-up question?</span>
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🏥</span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Follow-up Chat</h4>
                  <p className="text-xs text-gray-500">OrthoTriage Master</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {limitReached
                    ? 'No messages remaining'
                    : `${remainingMessages} of ${messageLimit} remaining`}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Collapse chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {/* Conversation starters */}
              {showStarters && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Your specialist would like to know:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedFollowUp.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleStarterClick(q)}
                        className="text-left text-xs px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-blue-700 max-w-full"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-4 py-3">
                    <div className="flex space-x-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Limit reached message */}
              {limitReached && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-3"
                >
                  <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-3 inline-block">
                    You&apos;ve used all {messageLimit} follow-up messages. For further questions, consult a healthcare provider.
                  </p>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-2"
                >
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
                    {error}
                    <button
                      onClick={() => {
                        setError(null);
                        if (inputValue) sendMessage(inputValue);
                      }}
                      className="ml-2 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </p>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    limitReached
                      ? 'Message limit reached'
                      : 'Ask a follow-up question...'
                  }
                  disabled={isLoading || limitReached}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading || limitReached}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

