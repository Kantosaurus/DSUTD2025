'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { CompleteNavbar } from '@/components/ui/resizable-navbar';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  type?: 'Mandatory' | 'Optional' | 'Pending';
  color?: string;
  description?: string;
  location?: string;
  end_time?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [signupStatuses, setSignupStatuses] = useState<{[key: string]: boolean}>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student');
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { name: 'Home', link: '/home' },
    { name: 'Events', link: '/calendar' },
    { name: 'Survival Kit', link: '/survival-kit' },
    { name: 'Admin Events', link: '/admin/events' },
    { name: 'Admin Logs', link: '/admin/logs' },
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      generateCalendarDays();
    }
  }, [currentDate, isAuthenticated]);

  const checkAuth = async () => {
    // Add a small delay to ensure localStorage is updated after login/signup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      router.push('/');
      return;
    }

    try {
      // Validate token with backend
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
  };

  const fetchEvents = async (year: number, month: number) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/calendar/events`, {
        params: { year, month: month + 1 }, // month is 0-indexed, API expects 1-indexed
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch calendar events');
      return {};
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const startDate = new Date(firstDayOfMonth);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const mondayStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert Sunday=0 to Sunday=6
    startDate.setDate(startDate.getDate() - mondayStart);
    
    const endDate = new Date(lastDayOfMonth);
    const lastDayOfWeek = lastDayOfMonth.getDay();
    const mondayEnd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek; // Days to add to complete the week
    endDate.setDate(endDate.getDate() + mondayEnd);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Fetch events for the current month
    const eventsData = await fetchEvents(year, month);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${day}`;
      const events = eventsData[dateString] || [];
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false,
        events: events,
      });
    }
    
    setCalendarDays(days);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    // Don't automatically select today's date to avoid blue outline
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setSelectedDayEvents(day.events);
    setSidePanelOpen(true);
    
    // Check signup status for all events
    day.events.forEach(event => {
      checkSignupStatus(event.id);
    });
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedDate(null);
  };

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'Mandatory':
        return 'bg-red-500 text-white px-1 py-0.5 rounded text-center font-medium';
      case 'Optional':
        return 'bg-blue-500 text-white px-1 py-0.5 rounded text-center font-medium';
      case 'Pending':
        return 'bg-amber-500 text-white px-1 py-0.5 rounded text-center font-medium';
      default:
        return 'text-gray-700';
    }
  };

  const renderEvents = (events: CalendarEvent[], maxVisible: number = 3) => {
    if (events.length === 0) return null;

    const visibleEvents = events.slice(0, maxVisible);
    const remainingCount = events.length - maxVisible;

    return (
      <div className="space-y-1 mt-2">
        {visibleEvents.map((event) => {
          const isColoredEvent = ['Mandatory', 'Optional', 'Pending'].includes(event.type || '');
          return (
            <div
              key={event.id}
              className={`text-xs leading-tight truncate ${getEventTypeStyle(event.type || '')}`}
            >
              {!isColoredEvent && (
                <span className="text-gray-500 font-medium">{event.time}</span>
              )}
              <span className={isColoredEvent ? '' : 'ml-1'}>
                {event.title}
              </span>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-500 font-medium">
            {remainingCount} more
          </div>
        )}
      </div>
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Mandatory':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Optional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'holiday':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'course':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time;
  };

  const handleEventSignup = async (eventId: string) => {
    if (!isAuthenticated) {
      alert('Please log in to sign up for events');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/events/${eventId}/signup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update signup status
      setSignupStatuses(prev => ({ ...prev, [eventId]: true }));
      alert('Successfully signed up for event!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to sign up for event');
    }
  };

  const handleEventCancel = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/events/${eventId}/signup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update signup status
      setSignupStatuses(prev => ({ ...prev, [eventId]: false }));
      alert('Successfully cancelled event signup!');
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.eventType === 'Mandatory') {
        alert('Cannot cancel signup for mandatory events. You are automatically enrolled in all mandatory events.');
      } else {
        alert(error.response?.data?.error || 'Failed to cancel event signup');
      }
    }
  };

  const checkSignupStatus = async (eventId: string) => {
    if (!isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/events/${eventId}/signup-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSignupStatuses(prev => ({ ...prev, [eventId]: response.data.signedUp }));
    } catch (error) {
      console.error('Error checking signup status:', error);
    }
  };

  const calendarLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Fetching calendar events..." },
    { text: "Loading event details..." },
    { text: "Preparing your schedule..." }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MultiStepLoader 
          loadingStates={calendarLoadingStates} 
          loading={isLoading} 
          duration={1200} 
          loop={false}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <CompleteNavbar navItems={navItems} userRole={userRole} />
      
      {/* Loading Overlay */}
      <MultiStepLoader 
        loadingStates={calendarLoadingStates} 
        loading={loading} 
        duration={1000} 
        loop={false}
      />
      
      <div className="p-6 relative">
        <div className={`max-w-7xl mx-auto h-full transition-all duration-300 ${sidePanelOpen ? 'blur-sm' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light text-gray-900 mb-2">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h1>
            <p className="text-gray-600 font-medium">
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'Select a date'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={goToToday}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
            >
              Today
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={goToNextMonth}
                className="p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="px-2 py-4 text-center text-sm font-semibold text-gray-600 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDateClick(day)}
                className={`
                  relative min-h-[140px] p-2 border-r border-b border-gray-100 cursor-pointer
                  transform transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-2 hover:shadow-xl
                  ${!day.isCurrentMonth ? 'bg-gray-25 text-gray-400' : 'bg-white'}
                  ${day.isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                `}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div className="flex flex-col h-full">
                  <div className={`
                    text-sm font-medium mb-1 text-right
                    ${day.isToday ? 'text-white' : 'text-gray-900'}
                    ${day.isSelected ? 'text-blue-700' : ''}
                    ${!day.isCurrentMonth ? 'text-gray-400' : ''}
                  `}>
                    {day.isToday ? (
                      <div className="flex justify-end">
                        <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                          {day.date.getDate()}
                        </span>
                      </div>
                    ) : (
                      day.date.getDate()
                    )}
                  </div>
                  
                  {/* Events */}
                  <div className="flex-1 overflow-hidden">
                    {renderEvents(day.events)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
              Loading events...
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Click on any date to select it • Events are displayed chronologically</p>
        </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-50
        ${sidePanelOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <p className="text-gray-500 text-sm">
                  {selectedDate?.toLocaleDateString('en-US', { 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={closeSidePanel}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Events</h3>
                <p className="text-gray-500">This day is free of scheduled events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {event.title}
                        </h3>
                        {event.time && (
                          <p className="text-sm text-gray-600 mb-2">
                            {formatTime(event.time)}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-sm text-gray-600 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-gray-700 text-sm mb-3">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded-full border
                        ${getEventTypeColor(event.type || 'regular')}
                      `}>
                        {event.type || 'regular'}
                      </span>
                    </div>
                    
                    {/* Signup Button */}
                    {isAuthenticated && (
                      <div className="mt-3">
                        {signupStatuses[event.id] ? (
                          event.type === 'Mandatory' ? (
                            <div className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-lg text-sm font-medium text-center border">
                              ✓ Mandatory Event - Auto Enrolled
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEventCancel(event.id)}
                              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                            >
                              Cancel Signup
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleEventSignup(event.id)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                          >
                            Sign Up
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {sidePanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closeSidePanel}
        />
      )}
    </div>
  );
} 