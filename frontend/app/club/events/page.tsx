'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CompleteNavbar } from '../../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../../components/ui/multi-step-loader'
import axios from 'axios'

const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
  { name: 'Team', link: '/meet-the-team' },
  { name: 'My Events', link: '/club/events' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' }
]

interface Event {
  id: number
  title: string
  description: string
  event_date: string
  start_time: string
  end_time: string
  event_type: 'Mandatory' | 'Optional'
  location: string
  color: string
  max_participants: number
  current_participants: number
  current_signups: number
  status: 'pending' | 'approved' | 'rejected'
  approval_date: string | null
  approved_by: number | null
  approver_student_id: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

interface EventAnalytics {
  eventId: number
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  eventType: string
  location: string
  maxParticipants: number
  currentParticipants: number
  actualSignups: number
  fillPercentage: number
  status: string
  creatorId: number
  creatorStudentId: string
  creatorRole: string
  approvalDate: string | null
  approvedBy: number | null
  approverStudentId: string | null
  signups: Array<{
    user_id: number
    student_id: string
    email: string
    signup_date: string
  }>
  createdAt: string
  updatedAt: string
}

export default function ClubEventsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'student' | 'club'>('student')
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const loadingStates = [
    { text: "Checking authentication..." },
    { text: "Loading your events..." },
    { text: "Preparing dashboard..." }
  ]

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(true)
          setUserRole(data.user.role || 'student')
          
          // Check if user has club or admin permissions
          if (!['club', 'admin'].includes(data.user.role)) {
            router.push('/home')
            return
          }
          
          await loadEvents(token)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadEvents = async (token: string, status?: string) => {
    try {
      const url = status ? `${API_URL}/api/events/my-events?status=${status}` : `${API_URL}/api/events/my-events`
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEvents(response.data.events)
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const createEvent = async (eventData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${API_URL}/api/events`, eventData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowCreateModal(false)
      await loadEvents(token!, activeTab === 'all' ? undefined : activeTab)
      
      // Show success message
      alert(response.data.requiresApproval 
        ? 'Event created successfully and is pending approval!' 
        : 'Event created and approved successfully!')
    } catch (error: any) {
      console.error('Error creating event:', error)
      alert('Error creating event: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const updateEvent = async (eventId: number, eventData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`${API_URL}/api/events/${eventId}`, eventData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowEditModal(false)
      setSelectedEvent(null)
      await loadEvents(token!, activeTab === 'all' ? undefined : activeTab)
      
      alert(response.data.requiresApproval 
        ? 'Event updated successfully and requires re-approval!' 
        : 'Event updated successfully!')
    } catch (error: any) {
      console.error('Error updating event:', error)
      alert('Error updating event: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const deleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      await loadEvents(token!, activeTab === 'all' ? undefined : activeTab)
      alert('Event deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting event:', error)
      alert('Error deleting event: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const loadEventAnalytics = async (eventId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/events/${eventId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEventAnalytics(response.data)
      setShowAnalyticsModal(true)
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      alert('Error loading analytics: ' + (error.response?.data?.error || 'Unknown error'))
    }
  }

  const handleTabChange = async (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
    setActiveTab(tab)
    const token = localStorage.getItem('token')
    if (token) {
      await loadEvents(token, tab === 'all' ? undefined : tab)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brown-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={loadingStates}
          loading={isLoading}
          duration={1200}
          loop={false}
        />
      </div>
    )
  }

  if (!isAuthenticated || !['club', 'admin'].includes(userRole)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brown-50 to-indigo-100">
      <CompleteNavbar navItems={navItems} userRole={userRole} />
      
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Events {userRole === 'club' && '(Club Management)'}
            </h1>
            <p className="text-gray-600">
              Create, manage, and track your events. {userRole === 'club' && 'Events require admin approval.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'All Events' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'rejected', label: 'Rejected' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.key
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Create Event Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create New Event
            </button>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No events found</p>
                <p className="text-gray-400">Create your first event to get started!</p>
              </div>
            ) : (
              events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4"
                  style={{ borderLeftColor: event.color }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                          {event.status.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.event_type === 'Mandatory' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {event.event_type}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{event.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Date:</span> {new Date(event.event_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Time:</span> {event.start_time} - {event.end_time}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {event.location}
                        </div>
                        <div>
                          <span className="font-medium">Signups:</span> {event.current_signups} / {event.max_participants || '∞'}
                        </div>
                      </div>

                      {event.status === 'rejected' && event.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-red-700 text-sm">
                            <span className="font-medium">Rejection Reason:</span> {event.rejection_reason}
                          </p>
                        </div>
                      )}

                      {event.status === 'approved' && event.approval_date && (
                        <div className="mt-3 text-sm text-green-600">
                          Approved on {new Date(event.approval_date).toLocaleDateString()}
                          {event.approver_student_id && ` by ${event.approver_student_id}`}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => loadEventAnalytics(event.id)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Analytics
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowEditModal(true)
                        }}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <EventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={createEvent}
          title="Create New Event"
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <EventModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEvent(null)
          }}
          onSubmit={(data) => updateEvent(selectedEvent.id, data)}
          title="Edit Event"
          initialData={selectedEvent}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && eventAnalytics && (
        <AnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false)
            setEventAnalytics(null)
          }}
          analytics={eventAnalytics}
        />
      )}
    </div>
  )
}

// Event Modal Component
interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  title: string
  initialData?: Event
}

function EventModal({ isOpen, onClose, onSubmit, title, initialData }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    event_date: initialData?.event_date || '',
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    event_type: initialData?.event_type || 'Optional',
    location: initialData?.location || '',
    max_participants: initialData?.max_participants || '',
    color: initialData?.color || '#EF5800'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({...formData, event_type: e.target.value as 'Mandatory' | 'Optional'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Optional">Optional</option>
                  <option value="Mandatory">Mandatory</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants (optional)</label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                {initialData ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Analytics Modal Component
interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  analytics: EventAnalytics
}

function AnalyticsModal({ isOpen, onClose, analytics }: AnalyticsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Event Analytics: {analytics.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.actualSignups}</div>
              <div className="text-sm text-blue-600">Total Signups</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.fillPercentage ? `${analytics.fillPercentage.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-green-600">Fill Rate</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{analytics.maxParticipants || '∞'}</div>
              <div className="text-sm text-yellow-600">Max Capacity</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 capitalize">{analytics.status}</div>
              <div className="text-sm text-purple-600">Status</div>
            </div>
          </div>

          {/* Event Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Event Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Date:</span> {new Date(analytics.eventDate).toLocaleDateString()}</div>
              <div><span className="font-medium">Time:</span> {analytics.startTime} - {analytics.endTime}</div>
              <div><span className="font-medium">Location:</span> {analytics.location}</div>
              <div><span className="font-medium">Type:</span> {analytics.eventType}</div>
            </div>
          </div>

          {/* Signups List */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Registered Participants ({analytics.signups.length})</h3>
            {analytics.signups.length === 0 ? (
              <p className="text-gray-500 italic">No participants registered yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Student ID</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Signup Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.signups.map((signup, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{signup.student_id}</td>
                        <td className="p-2">{signup.email}</td>
                        <td className="p-2">{new Date(signup.signup_date).toLocaleDateString()}</td>
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