'use client'

import React, { useState } from 'react'
import LoginCard from '../components/ui/login-card'
import SignUpModal from '../components/ui/signup-modal'
import ForgotPasswordModal from '../components/ui/forgot-password-modal'

export default function Home() {
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)

  const handleLogin = async (studentId: string, password: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      console.log('Login successful:', data);
      
      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to home page after successful login
      window.location.href = '/home';
      
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw the error so the login card can handle it
    }
  }

  const handleSignUp = async (studentId: string, password: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      console.log('Sign up successful:', data);
      
      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to home page after successful signup
      window.location.href = '/home';
      
    } catch (error) {
      console.error('Sign up error:', error);
      throw error; // Re-throw the error so the signup modal can handle it
    }
  }

  const handleForgotPassword = (studentId: string) => {
    console.log('Forgot password attempt:', { studentId })
    // Here you would typically make an API call to send reset email
    // For now, we'll just log the student ID
  }

  const handleSwitchToSignUp = () => {
    setShowSignUpModal(true)
  }

  const handleSwitchToForgotPassword = () => {
    setShowForgotPasswordModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <LoginCard 
          onSubmit={handleLogin} 
          onSwitchToSignUp={handleSwitchToSignUp}
          onForgotPassword={handleSwitchToForgotPassword}
        />
      </div>

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSubmit={handleSignUp}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSubmit={handleForgotPassword}
      />

      {/* Optional: Add a subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
    </div>
  )
} 