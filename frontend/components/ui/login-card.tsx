'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconUser, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react'

interface LoginCardProps {
  onSubmit?: (studentId: string, password: string) => void
  onSwitchToSignUp?: () => void
  onForgotPassword?: () => void
}

interface LoginError {
  type: 'validation' | 'credentials' | 'locked' | 'deactivated' | 'password_change' | 'network'
  message: string
  remainingAttempts?: number
  lockedUntil?: string
  remainingMinutes?: number
}

export default function LoginCard({ onSubmit, onSwitchToSignUp, onForgotPassword }: LoginCardProps) {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [error, setError] = useState<LoginError | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !password) return

    setIsLoading(true)
    setError(null)
    setRemainingAttempts(null)
    
    try {
      // Use the onSubmit prop from parent component
      if (onSubmit) {
        await onSubmit(studentId, password)
      }
    } catch (err: any) {
      setError({
        type: 'network',
        message: err.message || 'Network error. Please check your connection and try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-gray-900">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          >
            <IconUser className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-gray-600"
          >
            Sign in to your account
          </motion.p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student ID Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-2"
          >
            <motion.label 
              htmlFor="studentId" 
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
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onFocus={() => setFocusedField('studentId')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="Enter your student ID"
                required
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
          </motion.div>

          {/* Password Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <motion.label 
                htmlFor="password" 
                className="text-sm font-medium text-gray-700 block"
                animate={{ 
                  color: focusedField === 'password' ? '#3b82f6' : '#374151',
                  scale: focusedField === 'password' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              >
                Password
              </motion.label>
              {onForgotPassword && (
                <motion.button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  Forgot password?
                </motion.button>
              )}
            </div>
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                animate={{ 
                  color: focusedField === 'password' ? '#3b82f6' : '#9ca3af'
                }}
                transition={{ duration: 0.2 }}
              >
                <IconLock className="h-5 w-5" />
              </motion.div>
              <motion.input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="Enter your password"
                required
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                <AnimatePresence mode="wait">
                  {showPassword ? (
                    <motion.div
                      key="eye-off"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <IconEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="eye"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <IconEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none"
                animate={{
                  borderColor: focusedField === 'password' ? '#3b82f6' : 'transparent',
                  scale: focusedField === 'password' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !studentId || !password}
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
                  Signing in...
                </motion.div>
              ) : (
                <motion.span
                  key="signin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Sign In
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`mt-4 p-4 rounded-xl border ${
                error.type === 'locked' 
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : error.type === 'credentials'
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : error.type === 'password_change'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {error.type === 'locked' && (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM5.5 8a4.5 4.5 0 119 0v1H5.5V8z" clipRule="evenodd" />
                    </svg>
                  )}
                  {error.type === 'credentials' && (
                    <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {error.type === 'password_change' && (
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {error.type === 'network' && (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {error.type === 'locked' && 'Account Locked'}
                    {error.type === 'credentials' && 'Invalid Credentials'}
                    {error.type === 'password_change' && 'Password Change Required'}
                    {error.type === 'network' && 'Connection Error'}
                  </h3>
                  <div className="mt-1 text-sm">
                    <p>{error.message}</p>
                    {error.type === 'locked' && error.remainingMinutes && (
                      <p className="mt-1 font-medium">
                        Account will be unlocked in {error.remainingMinutes} minutes
                      </p>
                    )}
                    {error.type === 'credentials' && error.remainingAttempts !== undefined && (
                      <p className="mt-1 font-medium">
                        {error.remainingAttempts} login attempts remaining
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <motion.button
              onClick={onSwitchToSignUp}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              Sign up here
            </motion.button>
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
} 