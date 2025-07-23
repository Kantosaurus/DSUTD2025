'use client'

import React, { useEffect, useState } from 'react'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'

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
      {/* Resizable Navbar */}
      <CompleteNavbar navItems={navItems} />
      
      {/* Main Content */}
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center py-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to DSUTD
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your digital hub for SUTD student life. Manage your calendar, track your progress, and stay connected with your academic community.
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Calendar</h3>
              <p className="text-gray-600 mb-4">View and manage your academic schedule, events, and deadlines.</p>
              <a href="/calendar" className="text-blue-600 hover:text-blue-700 font-medium">View Calendar →</a>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard</h3>
              <p className="text-gray-600 mb-4">Track your academic progress and view important metrics.</p>
              <a href="/dashboard" className="text-green-600 hover:text-green-700 font-medium">View Dashboard →</a>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile</h3>
              <p className="text-gray-600 mb-4">Manage your account settings and personal information.</p>
              <a href="/profile" className="text-purple-600 hover:text-purple-700 font-medium">View Profile →</a>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">Successfully logged in</p>
                  <p className="text-gray-500 text-sm">Just now</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">Account created</p>
                  <p className="text-gray-500 text-sm">Today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 