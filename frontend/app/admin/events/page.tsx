'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompleteNavbar } from '../../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../../components/ui/multi-step-loader'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' },
]

export default function AdminEventsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Add a small delay to ensure localStorage is updated after login/signup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = localStorage.getItem('token')
      if (!token) {
        // Redirect to login if no token
        router.push('/')
        return
      }

      try {
        // Validate token with backend
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          
          // Check if user is admin
          if (data.user.role === 'admin') {
            setIsAdmin(true);
          } else {
            // Redirect non-admin users to home
            router.push('/home');
            return;
          }
        } else {
          // Token is invalid, clear it and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, clear token and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router])

  const adminEventsLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Verifying admin privileges..." },
    { text: "Loading admin events..." },
    { text: "Preparing management interface..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader 
          loadingStates={adminEventsLoadingStates} 
          loading={isLoading} 
          duration={1200} 
          loop={false}
        />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} userRole="admin" />
      
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Events Management</h1>
            <p className="text-xl text-gray-600">Manage all calendar events in the system</p>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Events Management</h3>
              <p className="text-gray-500">Admin events management interface coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 