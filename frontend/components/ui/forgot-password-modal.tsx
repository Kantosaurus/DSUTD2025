'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MultiStepLoader } from './multi-step-loader'
import { IconUser, IconX, IconMail, IconCheck, IconAlertCircle } from '@tabler/icons-react'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (studentId: string) => void
}

export default function ForgotPasswordModal({ isOpen, onClose, onSubmit }: ForgotPasswordModalProps) {
  const [studentId, setStudentId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId.trim()) {
      setError('Please enter your student ID')
      return
    }

    setError('')
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
      onSubmit?.(studentId)
    }, 1500)
  }

  const handleClose = () => {
    if (!isLoading) {
      setStudentId('')
      setError('')
      setIsSubmitted(false)
      onClose()
    }
  }

  const forgotPasswordLoadingStates = [
    { text: "Verifying your account..." },
    { text: "Generating reset link..." },
    { text: "Sending email..." }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Loading Overlay */}
          <MultiStepLoader 
            loadingStates={forgotPasswordLoadingStates} 
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
                <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-600 mt-1">Enter your student ID to receive reset instructions</p>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <IconX className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Student ID Input */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="space-y-2"
                >
                  <motion.label 
                    htmlFor="forgot-studentId" 
                    className="text-sm font-medium text-gray-700 block"
                    animate={{ 
                      color: focusedField === 'studentId' ? '#3b82f6' : '#374151',
                      scale: focusedField === 'studentId' ? 1.02 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    Student ID
                  </motion.label>
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div 
                      className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      animate={{ 
                        color: focusedField === 'studentId' ? '#3b82f6' : '#9ca3af'
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <IconUser className="h-5 w-5" />
                    </motion.div>
                    <motion.input
                      id="forgot-studentId"
                      type="text"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value)
                        if (error) setError('')
                      }}
                      onFocus={() => setFocusedField('studentId')}
                      onBlur={() => setFocusedField(null)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 ${
                        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your student ID"
                      required
                      disabled={isLoading}
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none"
                      animate={{
                        borderColor: focusedField === 'studentId' ? '#3b82f6' : 'transparent',
                        scale: focusedField === 'studentId' ? 1.02 : 1
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  </motion.div>
                  
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center space-x-2 text-red-600"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 15 }}
                        >
                          <IconAlertCircle className="w-4 h-4" />
                        </motion.div>
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Info Box */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                >
                  <div className="flex items-start space-x-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring", damping: 15 }}
                    >
                      <IconMail className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    </motion.div>
                    <div className="text-sm text-blue-800">
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-medium mb-1"
                      >
                        Reset Instructions
                      </motion.p>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        We'll send password reset instructions to your registered email address associated with this student ID.
                      </motion.p>
                    </div>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !studentId.trim()}
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
                        Sending instructions...
                      </motion.div>
                    ) : (
                      <motion.span
                        key="send"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Send Reset Instructions
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
            ) : (
              /* Success State */
              <div className="p-6 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 15 }}
                  className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center"
                >
                  <IconCheck className="w-8 h-8 text-green-600" />
                </motion.div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Instructions Sent!</h3>
                  <p className="text-sm text-gray-600">
                    We've sent password reset instructions to the email address associated with student ID <span className="font-medium text-gray-900">{studentId}</span>.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                  <p className="font-medium mb-1">What's next?</p>
                  <ul className="space-y-1 text-left">
                    <li>• Check your email inbox</li>
                    <li>• Click the reset link in the email</li>
                    <li>• Create a new password</li>
                    <li>• Sign in with your new password</li>
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:shadow-lg"
                >
                  Got it, thanks!
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 