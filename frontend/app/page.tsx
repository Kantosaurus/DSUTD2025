'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginCard from '../components/ui/login-card'
import SignUpModal from '../components/ui/signup-modal'
import { ForgotPasswordModal } from '../components/ui/forgot-password-modal'
import EmailVerificationModal from '../components/ui/email-verification-modal'

export default function Home() {
  const router = useRouter()
  const [showUserSignUpModal, setShowUserSignUpModal] = useState(false)
  const [showClubSignUpModal, setShowClubSignUpModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<{
    studentId: string;
    email: string;
  } | null>(null)

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
        if (data.requiresVerification) {
          // Show email verification modal for unverified users
          setPendingVerification({
            studentId: data.studentId,
            email: `${data.studentId}@mymail.sutd.edu.sg`
          });
          setShowEmailVerificationModal(true);
          throw new Error('Please verify your email address before logging in');
        }
        throw new Error(data.error || 'Login failed');
      }

      console.log('Login successful:', data);

      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to home page after successful login
      router.push('/home');

    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw the error so the login card can handle it
    }
  }

  const handleSignUp = async (studentId: string, password: string, telegramHandle?: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          password,
          telegramHandle
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      console.log('Sign up successful:', data);

      if (data.requiresVerification) {
        // Show email verification modal
        setPendingVerification({
          studentId: data.user.studentId,
          email: data.user.email
        });
        setShowEmailVerificationModal(true);
        setShowUserSignUpModal(false);
      } else {
        // Store the token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to home page after successful signup
        router.push('/home');
      }

    } catch (error) {
      console.error('Sign up error:', error);
      throw error; // Re-throw the error so the signup modal can handle it
    }
  }

  const handleForgotPassword = () => {
    // This function is called when the forgot password modal is successfully closed
    // The actual password reset logic is handled within the ForgotPasswordModal component
    console.log('Forgot password flow completed')
  }

  const handleSwitchToUserSignUp = () => {
    setShowUserSignUpModal(true)
  }

  const handleSwitchToClubSignUp = () => {
    setShowClubSignUpModal(true)
  }

  const handleSwitchToForgotPassword = () => {
    setShowForgotPasswordModal(true)
  }

  const handleVerificationSuccess = (token: string) => {
    // Redirect to home page after successful verification
    router.push('/home');
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
          onSwitchToUserSignUp={handleSwitchToUserSignUp}
          onSwitchToClubSignUp={handleSwitchToClubSignUp}
          onForgotPassword={handleSwitchToForgotPassword}
        />
      </div>

      {/* User Sign Up Modal */}
      <SignUpModal
        isOpen={showUserSignUpModal}
        onClose={() => setShowUserSignUpModal(false)}
        onSubmit={handleSignUp}
        type="user"
      />

      {/* Club Sign Up Modal */}
      <SignUpModal
        isOpen={showClubSignUpModal}
        onClose={() => setShowClubSignUpModal(false)}
        onSubmit={handleSignUp}
        type="club"
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={handleForgotPassword}
      />

      {/* Email Verification Modal */}
      {pendingVerification && (
        <EmailVerificationModal
          isOpen={showEmailVerificationModal}
          onClose={() => {
            setShowEmailVerificationModal(false);
            setPendingVerification(null);
          }}
          studentId={pendingVerification.studentId}
          email={pendingVerification.email}
          onVerificationSuccess={handleVerificationSuccess}
        />
      )}

      {/* Optional: Add a subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
    </div>
  )
}
