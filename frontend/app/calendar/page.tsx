'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { CompleteNavbar } from '@/components/ui/resizable-navbar';

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  type?: 'Mandatory' | 'Optional' | 'Pending';
  color?: string;
  description?: string;
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);

  const navItems = [
    {
      name: "Home",
      link: "/",
    },
    {
      name: "Events",
      link: "/calendar",
    },
    {
      name: "Survival Kit",
      link: "/survival-kit",
    },
    {
      name: "Maps",
      link: "/maps",
    },
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate]);

  const fetchEvents = async (year: number, month: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/calendar/events`, {
        params: { year, month: month + 1 } // month is 0-indexed, API expects 1-indexed
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
      const dateString = date.toISOString().split('T')[0];
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
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedDate(null);
  };

  const renderEvents = (events: CalendarEvent[], maxVisible: number = 3) => {
    if (events.length === 0) return null;

    const visibleEvents = events.slice(0, maxVisible);
    const remainingCount = events.length - maxVisible;

    return (
      <div className="space-y-1 mt-2">
        {visibleEvents.map((event) => (
          <div
            key={event.id}
            className={`
              text-xs leading-tight truncate
              ${event.type === 'Mandatory' 
                ? 'bg-green-600 text-white px-1 py-0.5 rounded text-center font-medium' 
                : 'text-gray-700'
              }
            `}
          >
            {event.type !== 'Mandatory' && (
              <span className="text-gray-500 font-medium">{event.time}</span>
            )}
            <span className={event.type === 'Mandatory' ? '' : 'ml-1'}>
              {event.title}
            </span>
          </div>
        ))}
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

  return (
    <div className="min-h-screen bg-white">
      <CompleteNavbar navItems={navItems} />
      
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