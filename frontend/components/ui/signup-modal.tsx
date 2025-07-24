'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconUser, IconLock, IconEye, IconEyeOff, IconX, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { MultiStepLoader } from './multi-step-loader'

interface SignUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (studentId: string, password: string) => void
}

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function SignUpModal({ isOpen, onClose, onSubmit }: SignUpModalProps) {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'text-gray-400'
  })

  // Password strength checker
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = []
    let score = 0

    // Length check
    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('At least 8 characters')
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One uppercase letter')
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One lowercase letter')
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('One number')
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('One special character')
    }

    let color = 'text-gray-400'
    if (score >= 5) color = 'text-green-500'
    else if (score >= 4) color = 'text-yellow-500'
    else if (score >= 3) color = 'text-orange-500'
    else if (score >= 2) color = 'text-red-500'

    return { score, feedback, color }
  }

  useEffect(() => {
    if (password) {
      setPasswordStrength(checkPasswordStrength(password))
    } else {
      setPasswordStrength({ score: 0, feedback: [], color: 'text-gray-400' })
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !password || !confirmPassword) return
    if (password !== confirmPassword) return
    if (passwordStrength.score < 5) return

    setIsLoading(true)
    
    try {
      // Call the onSubmit function which will handle the API call
      await onSubmit?.(studentId, password)
      onClose()
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Student ID validation
  const isValidStudentId = /^100[1-9]\d{3}$/.test(studentId)

  const isFormValid = studentId && password && confirmPassword && 
                     password === confirmPassword && 
                     passwordStrength.score >= 5 &&
                     isValidStudentId

  const signupLoadingStates = [
    { text: "Creating your account..." },
    { text: "Setting up your profile..." },
    { text: "Sending verification email..." }
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
            loadingStates={signupLoadingStates} 
            loading={isLoading} 
            duration={1000} 
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
                <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
                <p className="text-sm text-gray-600 mt-1">Join us today</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <IconX className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-900">
              {/* Student ID Input */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="space-y-2"
              >
                <motion.label 
                  htmlFor="signup-studentId" 
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
                    id="signup-studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onFocus={() => setFocusedField('studentId')}
                    onBlur={() => setFocusedField(null)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 ${
                      studentId && !isValidStudentId 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    placeholder="Enter your student ID (e.g., 1001234)"
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
                
                {/* Student ID Validation */}
                <AnimatePresence>
                  {studentId && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2"
                    >
                      {isValidStudentId ? (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                          >
                            <IconCheck className="w-4 h-4 text-green-500" />
                          </motion.div>
                          <span className="text-xs text-green-600">Valid student ID format</span>
                        </>
                      ) : (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                          >
                            <IconAlertCircle className="w-4 h-4 text-red-500" />
                          </motion.div>
                          <span className="text-xs text-red-600">Must be in format 100XXXX (X = 1-9)</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Password Input */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-2"
              >
                <motion.label 
                  htmlFor="signup-password" 
                  className="text-sm font-medium text-gray-700 block"
                  animate={{ 
                    color: focusedField === 'password' ? '#3b82f6' : '#374151',
                    scale: focusedField === 'password' ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                >
                  Password
                </motion.label>
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
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Create a strong password"
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

                {/* Password Strength Indicator */}
                <AnimatePresence>
                  {password && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      <motion.div 
                        className="flex items-center space-x-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${
                              passwordStrength.score >= 4 ? 'bg-green-500' :
                              passwordStrength.score >= 3 ? 'bg-yellow-500' :
                              passwordStrength.score >= 2 ? 'bg-orange-500' :
                              passwordStrength.score >= 1 ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                        <motion.span 
                          className={`text-xs font-medium ${passwordStrength.color}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {passwordStrength.score >= 5 ? 'Strong' :
                           passwordStrength.score >= 4 ? 'Good' :
                           passwordStrength.score >= 3 ? 'Fair' :
                           passwordStrength.score >= 2 ? 'Weak' : 'Very Weak'}
                        </motion.span>
                      </motion.div>
                      
                      {/* Password Requirements */}
                      <motion.div 
                        className="space-y-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {[
                          { text: 'At least 8 characters', met: password.length >= 8 },
                          { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
                          { text: 'One lowercase letter', met: /[a-z]/.test(password) },
                          { text: 'One number', met: /\d/.test(password) },
                          { text: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
                        ].map((requirement, index) => (
                          <motion.div 
                            key={index} 
                            className="flex items-center space-x-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                          >
                            <AnimatePresence mode="wait">
                              {requirement.met ? (
                                <motion.div
                                  key="check"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  transition={{ type: "spring", damping: 15 }}
                                >
                                  <IconCheck className="w-4 h-4 text-green-500" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="alert"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", damping: 15 }}
                                >
                                  <IconAlertCircle className="w-4 h-4 text-gray-400" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <motion.span 
                              className={`text-xs ${requirement.met ? 'text-green-600' : 'text-gray-500'}`}
                              animate={{ 
                                color: requirement.met ? '#059669' : '#6b7280'
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              {requirement.text}
                            </motion.span>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm Password Input */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-2"
              >
                <motion.label 
                  htmlFor="signup-confirmPassword" 
                  className="text-sm font-medium text-gray-700 block"
                  animate={{ 
                    color: focusedField === 'confirmPassword' ? '#3b82f6' : '#374151',
                    scale: focusedField === 'confirmPassword' ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                >
                  Confirm Password
                </motion.label>
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    animate={{ 
                      color: focusedField === 'confirmPassword' ? '#3b82f6' : '#9ca3af'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconLock className="h-5 w-5" />
                  </motion.div>
                  <motion.input
                    id="signup-confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 ${
                      confirmPassword && password !== confirmPassword 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-200'
                    }`}
                    placeholder="Confirm your password"
                    required
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                  >
                    <AnimatePresence mode="wait">
                      {showConfirmPassword ? (
                        <motion.div
                          key="eye-off-confirm"
                          initial={{ opacity: 0, rotate: -90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: 90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <IconEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="eye-confirm"
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
                      borderColor: focusedField === 'confirmPassword' ? '#3b82f6' : 'transparent',
                      scale: focusedField === 'confirmPassword' ? 1.02 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
                
                {/* Password Match Indicator */}
                <AnimatePresence>
                  {confirmPassword && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2"
                    >
                      {password === confirmPassword ? (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                          >
                            <IconCheck className="w-4 h-4 text-green-500" />
                          </motion.div>
                          <span className="text-xs text-green-600">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                          >
                            <IconAlertCircle className="w-4 h-4 text-red-500" />
                          </motion.div>
                          <span className="text-xs text-red-600">Passwords don't match</span>
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
                transition={{ delay: 0.4, duration: 0.5 }}
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
                      Creating account...
                    </motion.div>
                  ) : (
                    <motion.span
                      key="create"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Create Account
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 