'use client'

import React, { useEffect, useState } from 'react'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
]

export default function SurvivalKitPage() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
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