'use client'

import React, { useEffect, useState } from 'react'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../components/ui/multi-step-loader'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
]

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/'
      return
    }
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [])

  const homeLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Loading your dashboard..." },
    { text: "Preparing your workspace..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader 
          loadingStates={homeLoadingStates} 
          loading={isLoading} 
          duration={1200} 
          loop={false}
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} />
      
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Blank content area */}
        </div>
      </div>
    </div>
  )
} 