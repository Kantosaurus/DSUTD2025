'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../components/ui/multi-step-loader'

const navItems = [
  { name: 'Analytics Dashboard', link: '/analytics' }
]

interface EventAnalytics {
  id: string
  title: string
  description: string
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: string
  location: string
  color: string
  max_participants: number | null
  current_participants: number
  signup_count: number
  fill_percentage: number | null
  created_at: string
}

interface DashboardStats {
  totalEvents: number
  totalSignups: number
  mandatoryEvents: number
  optionalEvents: number
  averageSignupsPerEvent: number
  upcomingEvents: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAnalyticsUser, setIsAnalyticsUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<EventAnalytics[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [filterEventType, setFilterEventType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'signup_count' | 'fill_percentage' | 'event_date'>('signup_count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);

          // Check if user is admin (analytics users are also admin role)
          if (data.user.role === 'admin') {
            // Check if this is the analytics-only user
            try {
              const permissionsResponse = await fetch(`${API_URL}/api/admin/user-permissions`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (permissionsResponse.ok) {
                const permissionsData = await permissionsResponse.json();
                const permissions = permissionsData.permissions || {};
                
                // If this is analytics-only user, redirect them to events overview instead
                if (permissions.isAnalyticsOnly) {
                  router.push('/admin/events');
                  return;
                }
              }
            } catch (permissionError) {
              console.warn('Could not fetch permissions:', permissionError);
            }
            
            setIsAnalyticsUser(true);
            fetchAnalyticsData();
          } else {
            router.push('/home');
            return;
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
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

  const fetchAnalyticsData = async () => {
    setIsLoadingData(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch event analytics with proper parameters
      const queryParams = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      if (filterEventType !== 'all') {
        queryParams.append('eventType', filterEventType === 'mandatory' ? 'Mandatory' : 'Optional');
      }

      const eventsResponse = await fetch(`${API_URL}/api/admin/event-analytics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (eventsResponse.ok) {
        const analyticsData = await eventsResponse.json();
        
        // Transform the data to match our interface
        const transformedEvents = analyticsData.events?.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          event_type: event.event_type,
          location: event.location || '',
          color: event.color || (event.event_type === 'Mandatory' ? '#EF4444' : '#3B82F6'),
          max_participants: event.max_participants,
          current_participants: event.current_participants || 0,
          signup_count: parseInt(event.signup_count) || 0,
          fill_percentage: event.fill_percentage,
          created_at: event.created_at
        })) || [];

        setEvents(transformedEvents);
        
        // Set dashboard stats from the analytics response
        if (analyticsData.statistics) {
          setDashboardStats({
            totalEvents: analyticsData.statistics.totalEvents,
            totalSignups: analyticsData.statistics.totalSignups,
            mandatoryEvents: analyticsData.statistics.mandatoryEvents,
            optionalEvents: analyticsData.statistics.optionalEvents,
            averageSignupsPerEvent: analyticsData.statistics.averageSignupsPerEvent,
            upcomingEvents: analyticsData.statistics.upcomingEvents
          });
        }
      } else {
        setError('Failed to fetch analytics data');
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics data');
    } finally {
      setIsLoadingData(false);
    }
  }

  // Refetch data when filters change
  useEffect(() => {
    if (isAnalyticsUser && isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [filterEventType, sortBy, sortOrder])

  // Events are already filtered and sorted by the backend
  const getFilteredAndSortedEvents = () => {
    return events;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Use the dashboard stats from the backend, fallback to calculating from events
  const getDisplayStats = () => {
    if (dashboardStats) {
      return dashboardStats;
    }
    
    // Fallback calculation if backend stats are not available
    const mandatory = events.filter(e => e.event_type === 'Mandatory').length;
    const optional = events.filter(e => e.event_type === 'Optional').length;
    const totalSignups = events.reduce((sum, event) => sum + event.signup_count, 0);
    const avgSignups = events.length > 0 ? Math.round(totalSignups / events.length) : 0;

    return {
      totalEvents: events.length,
      totalSignups,
      mandatoryEvents: mandatory,
      optionalEvents: optional,
      averageSignupsPerEvent: avgSignups,
      upcomingEvents: 0
    };
  }

  const stats = getDisplayStats();

  const analyticsLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Verifying analytics access..." },
    { text: "Loading event signup data..." },
    { text: "Preparing analytics dashboard..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={analyticsLoadingStates}
          loading={isLoading}
          duration={1200}
          loop={false}
        />
      </div>
    )
  }

  if (!isAuthenticated || !isAnalyticsUser) {
    return null
  }

  const filteredEvents = getFilteredAndSortedEvents();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} userRole="admin" />

      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Signup Analytics</h1>
            <p className="text-xl text-gray-600">Track and analyze event participation across all events</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Signups</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSignups}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mandatory Events</p>
                  <p className="text-3xl font-bold text-red-600">{stats.mandatoryEvents}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Signups/Event</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.averageSignupsPerEvent}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white rounded-2xl shadow-lg p-6">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All Events</option>
                  <option value="mandatory">Mandatory Only</option>
                  <option value="optional">Optional Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="signup_count">Signup Count</option>
                  <option value="event_date">Event Date</option>
                  <option value="fill_percentage">Fill Percentage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="desc">Highest First</option>
                  <option value="asc">Lowest First</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchAnalyticsData}
              disabled={isLoadingData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Event Signup Details ({filteredEvents.length} events)
              </h2>
            </div>

            {isLoadingData ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading analytics data...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500">No events match the current filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Signups</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fill Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(event.event_date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                              border: `1px solid ${event.color}40`
                            }}
                          >
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-lg font-bold text-gray-900">{event.signup_count}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.max_participants ? event.max_participants : 'Unlimited'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {event.max_participants ? (
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (event.signup_count / event.max_participants) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {Math.round((event.signup_count / event.max_participants) * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}