'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MultiStepLoader } from './multi-step-loader'
import { IconMail, IconX, IconCheck, IconAlertCircle, IconRefresh } from '@tabler/icons-react'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  email: string
  onVerificationSuccess: (token: string) => void
}

export default function EmailVerificationModal({ 
  isOpen, 
  onClose, 
  studentId, 
  email, 
  onVerificationSuccess 
}: EmailVerificationModalProps) {
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          verificationCode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setSuccess('Email verified successfully!')
      
      // Store token and user data
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Call success callback
      onVerificationSuccess(data.token)
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
      
    } catch (error: any) {
      console.error('Verification error:', error)
      setError(error.message || 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code')
      }

      setSuccess('Verification code sent successfully!')
      setTimeLeft(60) // 60 second cooldown
      
    } catch (error: any) {
      console.error('Resend error:', error)
      setError(error.message || 'Failed to resend verification code')
    } finally {
      setIsResending(false)
    }
  }

  const isFormValid = verificationCode.length === 6

  const verificationLoadingStates = [
    { text: "Verifying your code..." },
    { text: "Checking account status..." },
    { text: "Activating your account..." }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Loading Overlay */}
          <MultiStepLoader 
            loadingStates={verificationLoadingStates} 
            loading={isLoading} 
            duration={800} 
            loop={false}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto text-gray-900 modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Verify Your Email</h2>
                <p className="text-sm text-gray-600 mt-1">Enter the 6-digit code sent to your email</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <IconX className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Email Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              >
                <div className="flex items-center space-x-3">
                  <IconMail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Verification code sent to:</p>
                    <p className="text-sm text-blue-700">{email}</p>
                  </div>
                </div>
              </motion.div>

              {/* Error/Success Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3"
                  >
                    <IconAlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3"
                  >
                    <IconCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-700">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verification Form */}
              <form onSubmit={handleVerification} className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <motion.label 
                    htmlFor="verification-code" 
                    className="text-sm font-medium text-gray-700 block"
                    animate={{ 
                      color: focusedField === 'verificationCode' ? '#3b82f6' : '#374151',
                      scale: focusedField === 'verificationCode' ? 1.02 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    Verification Code
                  </motion.label>
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.input
                      id="verification-code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setVerificationCode(value)
                      }}
                      onFocus={() => setFocusedField('verificationCode')}
                      onBlur={() => setFocusedField(null)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 text-center text-2xl font-mono tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none"
                      animate={{
                        borderColor: focusedField === 'verificationCode' ? '#3b82f6' : 'transparent',
                        scale: focusedField === 'verificationCode' ? 1.02 : 1
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  </motion.div>
                  
                  {/* Code Length Indicator */}
                  <AnimatePresence>
                    {verificationCode && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center space-x-2"
                      >
                        {verificationCode.length === 6 ? (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", damping: 15 }}
                            >
                              <IconCheck className="w-4 h-4 text-green-500" />
                            </motion.div>
                            <span className="text-xs text-green-600">Code complete</span>
                          </>
                        ) : (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", damping: 15 }}
                            >
                              <IconAlertCircle className="w-4 h-4 text-gray-400" />
                            </motion.div>
                            <span className="text-xs text-gray-500">{6 - verificationCode.length} digits remaining</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center"
                      >
                        <motion.div 
                          className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Verifying...
                      </motion.div>
                    ) : (
                      <motion.span
                        key="verify"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Verify Email
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              {/* Resend Code */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p className="text-sm text-gray-600 mb-3">
                  Didn't receive the code?
                </p>
                <motion.button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || timeLeft > 0}
                  whileHover={{ scale: timeLeft === 0 ? 1.05 : 1 }}
                  whileTap={{ scale: timeLeft === 0 ? 0.95 : 1 }}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    timeLeft > 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isResending ? (
                      <motion.div
                        key="resending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
                      />
                    ) : (
                      <motion.div
                        key="resend"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <IconRefresh className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span>
                    {timeLeft > 0 
                      ? `Resend in ${timeLeft}s` 
                      : isResending 
                        ? 'Sending...' 
                        : 'Resend Code'
                    }
                  </span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 