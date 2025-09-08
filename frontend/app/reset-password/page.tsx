'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      setIsCheckingToken(false)
      return
    }

    // Validate token by making a request to check if it's valid
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://'
      const response = await fetch(`${API_URL}/api/auth/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setIsValidToken(true)
      } else {
        setError('This reset link is invalid or has expired. Please request a new password reset.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsCheckingToken(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://'
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          router.push('/')
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

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthColor = passwordStrength <= 2 ? 'red' : passwordStrength <= 3 ? 'yellow' : 'green'
  const strengthText = passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : 'Strong'

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Return to Login
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
                         <input
               type="password"
               id="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
               placeholder="Enter your new password"
               required
               disabled={isLoading}
             />

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${
                    strengthColor === 'red' ? 'text-red-600' :
                    strengthColor === 'yellow' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {strengthText}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      strengthColor === 'red' ? 'bg-red-500' :
                      strengthColor === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
                         <input
               type="password"
               id="confirmPassword"
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
               placeholder="Confirm your new password"
               required
               disabled={isLoading}
             />
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={`flex items-center ${password.length >= 8 ? 'text-green-600' : ''}`}>
                <span className="mr-2">{password.length >= 8 ? '✓' : '○'}</span>
                At least 8 characters long
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                One uppercase letter
              </li>
              <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[a-z]/.test(password) ? '✓' : '○'}</span>
                One lowercase letter
              </li>
              <li className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/\d/.test(password) ? '✓' : '○'}</span>
                One number
              </li>
              <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'}</span>
                One special character
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3"
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-3"
            >
              <p className="text-green-700 text-sm">{message}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </motion.button>
        </form>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
          >
            ← Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
