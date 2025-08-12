'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompleteNavbar } from '../../components/ui/resizable-navbar';
import { AnimatedTooltip } from '../../components/ui/animated-tooltip';
import { MultiStepLoader } from '../../components/ui/multi-step-loader';

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Team', link: 'meet-the-team' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' }
];

const teamMembers = [
  { id: 1, name: 'Ainsley', designation: 'Mentor', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 2, name: 'Nic', designation: 'Mentor', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 3, name: 'Leo', designation: 'Mentor', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 4, name: 'Amith', designation: 'OpenSUTD', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 5, name: 'Yun Lin', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 6, name: 'Bimon', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 7, name: 'Li Yun', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 8, name: 'Mahek', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 9, name: 'Alena', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 10, name: 'Amit', designation: 'OpenSUTD', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 11, name: 'Dhyeya', designation: 'ROOT', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 12, name: 'Ryan Tan', designation: 'OpenSUTD', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
  { id: 13, name: 'Joey Goh', designation: 'OpenSUTD', image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iIzljYTNhZiIvPjxwYXRoIGQ9Ik0yMCA4MCBRNTAgNjAgODAgODAiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=' },
];

export default function MeetTheTeamPage() {
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

  const loadingStates = [
    { text: "Checking authentication..." },
    { text: "Loading team information..." },
    { text: "Preparing your workspace..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={loadingStates}
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
      <CompleteNavbar navItems={navItems} userRole={userRole} />

      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meet the Team</h1>
            <p className="text-xl text-gray-600">The amazing people behind DSUTD 2025</p>
          </div>

          {/* Team Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Team</h2>

            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <AnimatedTooltip items={teamMembers} />
            </div>

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.designation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mentors */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Mentors</h3>
              <div className="space-y-2">
                {teamMembers.filter(member => member.designation === 'Mentor').map((member) => (
                  <div key={member.id} className="text-center py-2 bg-blue-50 rounded-lg">
                    <span className="font-medium text-gray-900">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROOT */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">ROOT</h3>
              <div className="space-y-2">
                {teamMembers.filter(member => member.designation === 'ROOT').map((member) => (
                  <div key={member.id} className="text-center py-2 bg-green-50 rounded-lg">
                    <span className="font-medium text-gray-900">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OpenSUTD */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">OpenSUTD</h3>
              <div className="space-y-2">
                {teamMembers.filter(member => member.designation === 'OpenSUTD').map((member) => (
                  <div key={member.id} className="text-center py-2 bg-purple-50 rounded-lg">
                    <span className="font-medium text-gray-900">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
