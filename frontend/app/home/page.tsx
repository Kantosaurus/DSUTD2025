'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../components/ui/multi-step-loader'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
  { name: 'Team', link: '/meet-the-team' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' }
]

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student')
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUserRole(data.user.role || 'student');
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
    <div className="min-h-screen bg-white from-slate-50 via-blue-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} userRole={userRole} />

      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Main Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-16"
          >
            {/* Side-by-side layout */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 mb-12">
              {/* Hey there Freshies! */}
              <motion.h1
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-6xl font-bold text-left lg:text-left"
                style={{ color: '#932527' }}
              >
                Hey<br />
                there<br />
                Freshies!
              </motion.h1>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
              >
                <div className="p-8 lg:p-12">
                  <div className="text-gray-500 text-sm text-center">
                    <img
                      src="/DSUTDHomePage.png"
                      className="w-[400px] h-auto max-h-[600px] object-contain mx-auto"
                      alt="DSUTD home page logo"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* This is DiscoverSUTD! - Centered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl mb-4 text-gray-800">This is</h2>
              <h1
                className="text-5xl font-bold mb-6"
                style={{ color: '#631D35' }}
              >
                DiscoverSUTD!
              </h1>
              <div className="max-w-2xl mx-auto text-gray-700 text-lg leading-relaxed">
                <p className="mb-2">The one stop place for everything that you need-</p>
                <p>Be amazed by the sessions brought to you by our SUTD community!</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Content Sections */}
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Events Section */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
            >
              <motion.h3
                className="text-4xl font-bold mb-4"
                style={{ color: '#631D35' }}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                Events
              </motion.h3>
              <div className="text-gray-700 text-lg leading-relaxed">
                <p className="mb-3">Explore the full calendar of exciting DiscoverSUTD sessions!</p>
                <p>Sign up for talks, socials, and more — all in one place. Mandatory events are clearly marked so you never miss a beat!</p>
              </div>
            </motion.div>

            {/* Survivor Kit Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 cursor-pointer hover:shadow-2xl transition-all duration-300"
            >
              <motion.h3
                className="text-4xl font-bold mb-4"
                style={{ color: '#631D35' }}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                Survivor Kit
              </motion.h3>
              <div className="text-gray-700 text-lg leading-relaxed">
                <p className="mb-3">Your ultimate Freshman cheat sheet.</p>
                <p>From where to eat and how to get around, to joining clubs and acing Term 1 — this kit has everything you need to settle into SUTD life.</p>
              </div>
            </motion.div>


          </div>
        </div>
      </div>
    </div>
  );
}
