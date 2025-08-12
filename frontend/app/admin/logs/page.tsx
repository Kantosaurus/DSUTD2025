'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompleteNavbar } from '../../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../../components/ui/multi-step-loader'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' },
  { name: 'Team', link: 'meet-the-team' }
]

interface DashboardStats {
  users: {
    total: number
    byRole: { [key: string]: number }
  }
  events: {
    total: number
    upcoming: number
    ongoing: number
    past: number
  }
  currentEvent: any
  nextEvent: any
  signups: {
    total: number
  }
  activity: {
    recent: number
    failedLogins: number
  }
}

interface ActivityLog {
  id: number
  event_type: string
  event_description: string
  created_at: string
  student_id?: string
  email?: string
  ip_address?: string
  user_agent?: string
  metadata?: any
}

interface UserRegistration {
  id: number
  student_id: string
  email: string
  role: string
  created_at: string
  last_login?: string
  is_active: boolean
  total_signups: number
}

interface EventSignup {
  id: number
  user_id: number
  event_id: number
  signup_date: string
  student_id: string
  email: string
  event_title: string
  event_date: string
  event_type: string
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Dashboard data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([])
  const [eventSignups, setEventSignups] = useState<EventSignup[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loadingData, setLoadingData] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLogType, setSelectedLogType] = useState('')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);

          if (data.user.role === 'admin') {
            setIsAdmin(true);
            loadDashboardData();
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

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');

      const statsResponse = await fetch(`${API_URL}/api/admin/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setDashboardStats(stats);
      }

      await loadActivityLogs();
      await loadUserRegistrations();
      await loadEventSignups();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadActivityLogs = async (page = 1, type = '') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (type) params.append('type', type);

      const response = await fetch(`${API_URL}/api/admin/activity-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  };

  const loadUserRegistrations = async (page = 1) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      const response = await fetch(`${API_URL}/api/admin/user-registrations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserRegistrations(data.users);
      }
    } catch (error) {
      console.error('Error loading user registrations:', error);
    }
  };

  const loadEventSignups = async (page = 1) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      const response = await fetch(`${API_URL}/api/admin/event-signups?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventSignups(data.signups);
      }
    } catch (error) {
      console.error('Error loading event signups:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'user_registration': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'email_verified': 'bg-blue-50 text-blue-700 border-blue-200',
      'EVENT_SIGNUP': 'bg-purple-50 text-purple-700 border-purple-200',
      'EVENT_CANCEL': 'bg-red-50 text-red-700 border-red-200',
      'login_success': 'bg-green-50 text-green-700 border-green-200',
      'login_failed': 'bg-orange-50 text-orange-700 border-orange-200',
      'registration_failed': 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const adminLogsLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Verifying admin privileges..." },
    { text: "Loading system logs..." },
    { text: "Preparing monitoring interface..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={adminLogsLoadingStates}
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
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-light text-gray-900 mb-4 tracking-tight">
              System Monitor
            </h1>
            <p className="text-xl text-gray-600 font-light">
              Real-time insights and activity tracking
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="border-b border-gray-100">
              <nav className="flex space-x-1 p-2" aria-label="Tabs">
                {[
                  { id: 'dashboard', name: 'Overview', icon: '📊' },
                  { id: 'activity', name: 'Activity', icon: '📝' },
                  { id: 'users', name: 'Users', icon: '👥' },
                  { id: 'signups', name: 'Events', icon: '📅' }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 px-6 rounded-2xl font-medium text-sm transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </motion.button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {loadingData ? (
                      <motion.div
                        className="text-center py-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-light">Loading insights...</p>
                      </motion.div>
                    ) : dashboardStats ? (
                      <>
                        {/* Stats Grid */}
                        <motion.div
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                        >
                          {[
                            {
                              title: 'Total Users',
                              value: dashboardStats?.users?.total || 0,
                              icon: '👥',
                              color: 'from-blue-500 to-blue-600',
                              delay: 0
                            },
                            {
                              title: 'Total Events',
                              value: dashboardStats?.events?.total || 0,
                              icon: '📅',
                              color: 'from-emerald-500 to-emerald-600',
                              delay: 0.1
                            },

                            {
                              title: 'Recent Activity',
                              value: dashboardStats?.activity?.recent || 0,
                              icon: '⚡',
                              color: 'from-orange-500 to-orange-600',
                              delay: 0.3
                            }
                          ].map((stat, index) => (
                            <motion.div
                              key={stat.title}
                              className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
                              variants={fadeInUp}
                              whileHover={{
                                scale: 1.05,
                                transition: { duration: 0.2 }
                              }}
                              onHoverStart={() => setHoveredCard(stat.title)}
                              onHoverEnd={() => setHoveredCard(null)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm opacity-90 font-light">{stat.title}</p>
                                  <p className="text-3xl font-light mt-1">{stat.value}</p>
                                </div>
                                <motion.div
                                  className="text-3xl"
                                  animate={{
                                    rotate: hoveredCard === stat.title ? 360 : 0,
                                    scale: hoveredCard === stat.title ? 1.2 : 1
                                  }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {stat.icon}
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>

                        {/* Event Status Cards */}
                        <motion.div
                          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                        >
                          <motion.div
                            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                            variants={fadeInUp}
                            whileHover={{ scale: 1.02 }}
                          >
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Status</h3>
                            <div className="space-y-3">
                              {[
                                                            { label: 'Upcoming', value: dashboardStats?.events?.upcoming || 0, color: 'bg-blue-100 text-blue-700' },
                            { label: 'Ongoing', value: dashboardStats?.events?.ongoing || 0, color: 'bg-emerald-100 text-emerald-700' },
                            { label: 'Past', value: dashboardStats?.events?.past || 0, color: 'bg-gray-100 text-gray-700' }
                              ].map((item) => (
                                <motion.div
                                  key={item.label}
                                  className="flex justify-between items-center"
                                  whileHover={{ x: 5 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <span className="text-gray-600 font-light">{item.label}</span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                                    {item.value}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>

                          <motion.div
                            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                            variants={fadeInUp}
                            whileHover={{ scale: 1.02 }}
                          >
                            <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
                            <div className="space-y-3">
                              {[
                                                            { label: 'Admins', value: dashboardStats?.users?.byRole?.admin || 0, color: 'bg-red-100 text-red-700' },
                            { label: 'Students', value: dashboardStats?.users?.byRole?.student || 0, color: 'bg-emerald-100 text-emerald-700' }
                              ].map((item) => (
                                <motion.div
                                  key={item.label}
                                  className="flex justify-between items-center"
                                  whileHover={{ x: 5 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <span className="text-gray-600 font-light">{item.label}</span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                                    {item.value}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>

                          <motion.div
                            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                            variants={fadeInUp}
                            whileHover={{ scale: 1.02 }}
                          >
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
                            <div className="space-y-3">
                              {[
                                                            { label: 'Failed Logins (24h)', value: dashboardStats?.activity?.failedLogins || 0, color: 'bg-red-100 text-red-700' },
                            { label: 'Total Signups', value: dashboardStats?.signups?.total || 0, color: 'bg-blue-100 text-blue-700' }
                              ].map((item) => (
                                <motion.div
                                  key={item.label}
                                  className="flex justify-between items-center"
                                  whileHover={{ x: 5 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <span className="text-gray-600 font-light">{item.label}</span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                                    {item.value}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        </motion.div>

                        {/* Current & Next Events */}
                                                  {(dashboardStats?.currentEvent || dashboardStats?.nextEvent) && (
                          <motion.div
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                          >
                            {dashboardStats?.currentEvent && (
                              <motion.div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.02 }}
                              >
                                <h3 className="text-lg font-medium mb-4">Current Event</h3>
                                <div className="space-y-2">
                                                                  <p className="text-xl font-light">{dashboardStats?.currentEvent?.title}</p>
                                <p className="opacity-90 font-light">{dashboardStats?.currentEvent?.event_date}</p>
                                <p className="opacity-90 font-light">Created by: {dashboardStats?.currentEvent?.creator_student_id}</p>
                                </div>
                              </motion.div>
                            )}

                            {dashboardStats?.nextEvent && (
                              <motion.div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.02 }}
                              >
                                <h3 className="text-lg font-medium mb-4">Next Event</h3>
                                <div className="space-y-2">
                                                                  <p className="text-xl font-light">{dashboardStats?.nextEvent?.title}</p>
                                <p className="opacity-90 font-light">{dashboardStats?.nextEvent?.event_date}</p>
                                <p className="opacity-90 font-light">Created by: {dashboardStats?.nextEvent?.creator_student_id}</p>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <motion.div
                        className="text-center py-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="text-gray-600 font-light">Failed to load dashboard data</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Filter */}
                    <motion.div
                      className="flex items-center space-x-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <select
                        value={selectedLogType}
                        onChange={(e) => {
                          setSelectedLogType(e.target.value);
                          loadActivityLogs(1, e.target.value);
                        }}
                        className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium"
                      >
                        <option value="" className="text-gray-900">All Activity Types</option>
                        <option value="user_registration" className="text-gray-900">User Registration</option>
                        <option value="email_verified" className="text-gray-900">Email Verification</option>
                        <option value="EVENT_SIGNUP" className="text-gray-900">Event Signup</option>
                        <option value="EVENT_CANCEL" className="text-gray-900">Event Cancellation</option>
                        <option value="login_success" className="text-gray-900">Login Success</option>
                        <option value="login_failed" className="text-gray-900">Login Failed</option>
                      </select>
                    </motion.div>

                    {/* Activity Logs */}
                    <motion.div
                      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        <AnimatePresence>
                          {activityLogs.map((log, index) => (
                            <motion.div
                              key={log.id}
                              className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ x: 5 }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(log.event_type)}`}>
                                      {log.event_type}
                                    </span>
                                    <span className="text-sm text-gray-500 font-light">{formatDate(log.created_at)}</span>
                                  </div>
                                  <p className="text-gray-900 font-light">{log.event_description}</p>
                                  {log.student_id && (
                                    <p className="mt-1 text-sm text-gray-600 font-light">
                                      User: {log.student_id} ({log.email})
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <motion.div
                        className="flex justify-center space-x-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <motion.button
                          onClick={() => loadActivityLogs(currentPage - 1, selectedLogType)}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Previous
                        </motion.button>
                        <span className="px-4 py-2 text-gray-600 font-light">
                          Page {currentPage} of {totalPages}
                        </span>
                        <motion.button
                          onClick={() => loadActivityLogs(currentPage + 1, selectedLogType)}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Next
                        </motion.button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'users' && (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <motion.div
                      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900">User Registrations</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events Joined</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white/30 divide-y divide-gray-100">
                            <AnimatePresence>
                              {userRegistrations.map((user, index) => (
                                <motion.tr
                                  key={user.id}
                                  className="hover:bg-gray-50/50 transition-colors duration-200"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={{ x: 5 }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.student_id}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">{user.email}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">{formatDate(user.created_at)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">
                                    {user.total_signups} signups
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {activeTab === 'signups' && (
                  <motion.div
                    key="signups"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <motion.div
                      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900">Event Signups</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signup Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>

                            </tr>
                          </thead>
                          <tbody className="bg-white/30 divide-y divide-gray-100">
                            <AnimatePresence>
                              {eventSignups.map((signup, index) => (
                                <motion.tr
                                  key={signup.id}
                                  className="hover:bg-gray-50/50 transition-colors duration-200"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={{ x: 5 }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{signup.student_id}</div>
                                      <div className="text-sm text-gray-500 font-light">{signup.email}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{signup.event_title}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      {signup.event_type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">{formatDate(signup.signup_date)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-light">{signup.event_date}</td>

                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
