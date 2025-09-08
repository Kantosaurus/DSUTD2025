'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconUser, IconLock, IconEye, IconEyeOff, IconAlertCircle } from '@tabler/icons-react'

interface LoginCardProps {
  onSubmit?: (studentId: string, password: string) => void
  onSwitchToUserSignUp?: () => void
  onSwitchToClubSignUp?: () => void
  onForgotPassword?: () => void
}

interface LoginError {
  type: 'validation' | 'credentials' | 'locked' | 'deactivated' | 'verification' | 'network'
  message: string
  remainingAttempts?: number
  lockedUntil?: string
  remainingMinutes?: number
}

export default function LoginCard({ onSubmit, onSwitchToUserSignUp, onSwitchToClubSignUp, onForgotPassword }: LoginCardProps) {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [error, setError] = useState<LoginError | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId.trim() || !password.trim()) {
      setError({
        type: 'validation',
        message: 'Please enter both student ID and password'
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          studentId: studentId.trim(),
          password: password.trim()
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        
        if (response.status === 401) {
          if (data.requiresVerification) {
            setError({
              type: 'verification',
              message: 'Please verify your email before logging in'
            })
          } else {
            setError({
              type: 'credentials',
              message: data.error || 'Invalid credentials',
              remainingAttempts: data.remainingAttempts
            })
          }
        } else if (response.status === 423) {
          setError({
            type: 'locked',
            message: data.error || 'Account is locked',
            lockedUntil: data.lockedUntil,
            remainingMinutes: Math.ceil((new Date(data.lockedUntil).getTime() - new Date().getTime()) / 60000)
          })
        } else {
          setError({
            type: 'network',
            message: data.error || 'Login failed. Please try again.'
          })
        }
        return
      }

      const data = await response.json()
      
      // Call parent component's onSubmit handler
      if (onSubmit) {
        await onSubmit(studentId.trim(), password.trim())
      }

    } catch (err: any) {
      console.error('Login error:', err)
      if (err.name === 'TypeError' && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        setError({
          type: 'network',
          message: 'Cannot connect to server. Please check if the backend is running and try again.'
        })
      } else {
        setError({
          type: 'network',
          message: err.message || 'Network error. Please check your connection and try again.'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md mx-auto relative"
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Signing you in...</p>
          </div>
        </div>
      )}
      <div className="text-gray-900">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto m-0 flex items-center justify-center"
          >
            <img src="/dsutd2025.svg" className="w-[280px] h-auto max-h-[200px] object-contain" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Welcome to DSUTD
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
              Student ID or Email
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
                placeholder="Enter your student ID or email"
                required
                disabled={isLoading}
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
              <motion.div
                className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                animate={{
                  borderColor: focusedField === 'studentId' ? '#3b82f6' : 'rgba(0, 0, 0, 0)',
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
                  disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                animate={{
                  borderColor: focusedField === 'password' ? '#3b82f6' : 'rgba(0, 0, 0, 0)',
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
            disabled={isLoading || !studentId.trim() || !password.trim()}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg disabled:hover:bg-black"
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
                  : error.type === 'verification'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <IconAlertCircle className="h-5 w-5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {error.type === 'locked' && 'Account Locked'}
                    {error.type === 'credentials' && 'Invalid Credentials'}
                    {error.type === 'verification' && 'Email Verification Required'}
                    {error.type === 'network' && 'Connection Error'}
                    {error.type === 'validation' && 'Validation Error'}
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
      </div>
    </motion.div>
  )
}