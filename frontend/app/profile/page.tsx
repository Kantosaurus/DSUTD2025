'use client';

import React, { useEffect, useState } from 'react';
import { CompleteNavbar } from '../../components/ui/resizable-navbar';
import axios from 'axios';

interface User {
  studentId: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  type?: string;
  isOver: boolean;
}

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
];

export default function ProfilePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [signedUpEvents, setSignedUpEvents] = useState<Event[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('token');
    console.log('Profile page - Token check:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.log('Profile page - Redirecting to landing page due to no token');
      window.location.href = '/';
      return;
    }

    try {
      console.log('Profile page - Loading user data...');
      // Load user data
      const userResponse = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(userResponse.data);
      console.log('Profile page - User data loaded:', userResponse.data);

      console.log('Profile page - Loading signed up events...');
      // Load signed up events
      const eventsResponse = await axios.get(`${API_URL}/api/profile/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSignedUpEvents(eventsResponse.data);
      console.log('Profile page - Events loaded:', eventsResponse.data);

      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Error loading profile data:', error);
      if (error.response?.status === 401) {
        console.log('Profile page - Token invalid, clearing storage and redirecting');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        console.log('Profile page - Other error, but keeping user logged in');
        // For other errors, don't log out the user, just show an error
        setPasswordMessage('Error loading profile data. Please try refreshing the page.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters long');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/profile/password`, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPasswordMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage(error.response?.data?.error || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  const getEventStatus = (event: Event) => {
    const eventDate = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    
    if (event.isOver) {
      return { status: 'completed', color: 'bg-gray-100 text-gray-600', text: 'Completed' };
    } else if (eventDate < now) {
      return { status: 'ongoing', color: 'bg-green-100 text-green-800', text: 'Ongoing' };
    } else {
      return { status: 'upcoming', color: 'bg-blue-100 text-blue-800', text: 'Upcoming' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} />
      
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile</h1>
            <p className="text-xl text-gray-600">Manage your account and view your events</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg text-gray-900 font-medium">
                    {user?.studentId}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg text-gray-900">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Password Update Form */}
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Update Password</h3>
                
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  {passwordMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      passwordMessage.includes('successfully') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {passwordMessage}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>

            {/* Events Queue */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Events</h2>
              
              {signedUpEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Events</h3>
                  <p className="text-gray-500">You haven't signed up for any events yet.</p>
                  <a 
                    href="/calendar" 
                    className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Browse Events →
                  </a>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {signedUpEvents.map((event) => {
                    const status = getEventStatus(event);
                    return (
                      <div
                        key={event.id}
                        className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                          status.status === 'completed' ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {event.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">
                              {formatDate(event.date)} at {formatTime(event.time)}
                            </p>
                            {event.description && (
                              <p className="text-gray-700 text-sm mb-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        {event.type && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Type:</span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {event.type}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 