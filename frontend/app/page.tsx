'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginCard from '../components/ui/login-card'
import SignUpModal from '../components/ui/signup-modal'
import { ForgotPasswordModal } from '../components/ui/forgot-password-modal'
import EmailVerificationModal from '../components/ui/email-verification-modal'
import { MfaModal } from '../components/ui/mfa-modal'

export default function Home() {
  const router = useRouter()
  const [showUserSignUpModal, setShowUserSignUpModal] = useState(false)
  const [showClubSignUpModal, setShowClubSignUpModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [showMfaModal, setShowMfaModal] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<{
    studentId: string;
    email: string;
  } | null>(null)
  const [pendingMfa, setPendingMfa] = useState<{
    studentId: string;
  } | null>(null)

  const handleLogin = async (studentId: string, password: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
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

      console.log('Login response:', data);

      // Check if MFA is required
      if (data.requiresMFA) {
        setPendingMfa({
          studentId: data.studentId || studentId
        });
        setShowMfaModal(true);
        return; // Don't proceed to redirect
      }

      // Complete login - store token and redirect
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Check if this is an analytics-only user and redirect appropriately
      if (data.user && data.user.role === 'admin') {
        try {
          const permissionsResponse = await fetch(`${API_URL}/api/admin/user-permissions`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });
          
          if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json();
            const permissions = permissionsData.permissions || {};
            
            if (permissions.isAnalyticsOnly) {
              router.push('/admin/events');
              return;
            }
          }
        } catch (permissionError) {
          console.warn('Could not check user permissions:', permissionError);
        }
      }
      
      router.push('/home');

    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw the error so the login card can handle it
    }
  }

  const handleSignUp = async (studentId: string, password: string, telegramHandle?: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
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

  const handleMfaSubmit = async (mfaCode: string) => {
    try {
      if (!pendingMfa) {
        throw new Error('No pending MFA request');
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${API_URL}/api/auth/verify-mfa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: pendingMfa.studentId,
          mfaCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'MFA verification failed');
      }

      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Close MFA modal and redirect appropriately
      setShowMfaModal(false);
      setPendingMfa(null);
      
      // Check if this is an analytics-only user and redirect appropriately
      if (data.user && data.user.role === 'admin') {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
          const permissionsResponse = await fetch(`${API_URL}/api/admin/user-permissions`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });
          
          if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json();
            const permissions = permissionsData.permissions || {};
            
            if (permissions.isAnalyticsOnly) {
              router.push('/admin/events');
              return;
            }
          }
        } catch (permissionError) {
          console.warn('Could not check user permissions:', permissionError);
        }
      }
      
      router.push('/home');

    } catch (error) {
      console.error('MFA verification error:', error);
      throw error; // Re-throw the error so the MFA modal can handle it
    }
  }

  const handleVerificationSuccess = (token: string) => {
    // Redirect to home page after successful verification
    router.push('/home');
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">

      {/* Main content */}
      <div className="w-full max-w-md">
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

      {/* MFA Modal */}
      {pendingMfa && (
        <MfaModal
          isOpen={showMfaModal}
          onClose={() => {
            setShowMfaModal(false);
            setPendingMfa(null);
          }}
          onSubmit={handleMfaSubmit}
          studentId={pendingMfa.studentId}
        />
      )}

    </div>
  )
}
