'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MfaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (mfaCode: string) => Promise<void>
  studentId: string
}

export const MfaModal: React.FC<MfaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  studentId
}) => {
  const [mfaCode, setMfaCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaCode.trim() || mfaCode.length !== 7) {
      setError('MFA code must be exactly 7 characters')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onSubmit(mfaCode.trim().toUpperCase())
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setMfaCode('')
      setError('')
      setTimeLeft(300)
      onClose()
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Telegram Authentication</h2>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 mt-2 text-sm">
                Check your Telegram for the MFA code
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student ID Display */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Authenticating for:</p>
                  <p className="font-medium text-gray-900">{studentId}</p>
                </div>

                {/* Timer */}
                <div className="text-center">
                  <p className="text-sm text-gray-500">Code expires in:</p>
                  <p className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>

                {/* MFA Code Input */}
                <div>
                  <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-2">
                    MFA Code from Telegram
                  </label>
                  <input
                    type="text"
                    id="mfaCode"
                    value={mfaCode}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                      if (value.length <= 7) {
                        setMfaCode(value)
                      }
                    }}
                    placeholder="XXXXXXX"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 text-center font-mono text-lg tracking-widest"
                    required
                    disabled={isLoading}
                    maxLength={7}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Enter the 7-character code from your Telegram
                  </p>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-3"
                    >
                      <p className="text-red-700 text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !mfaCode.trim() || mfaCode.length !== 7}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify & Sign In'
                  )}
                </motion.button>
              </form>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Having trouble?</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Check your Telegram for the MFA code message</li>
                  <li>• Make sure you entered the code exactly as shown</li>
                  <li>• The code expires in 5 minutes</li>
                  <li>• Contact support if you're not receiving codes</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}