'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [studentId, setStudentId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setStudentId('')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 3000)
      } else {
        setError(data.error || 'An error occurred. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setStudentId('')
      setError('')
      setMessage('')
      onClose()
    }
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
                <h2 className="text-xl font-semibold">Forgot Password</h2>
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
                Enter your student ID to receive a new password via Telegram
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                                     <input
                     type="text"
                     id="studentId"
                     value={studentId}
                     onChange={(e) => setStudentId(e.target.value)}
                     placeholder="100XXXX"
                     className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                     required
                     disabled={isLoading}
                   />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: 100XXXX (where X is a digit from 1-9)
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

                {/* Success Message */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-50 border border-green-200 rounded-xl p-3"
                    >
                      <p className="text-green-700 text-sm">{message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !studentId.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending New Password...
                    </div>
                  ) : (
                    'Send New Password'
                  )}
                </motion.button>
              </form>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• We'll generate a new temporary password</li>
                  <li>• The password will be sent to your Telegram account</li>
                  <li>• Please change your password after logging in</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 