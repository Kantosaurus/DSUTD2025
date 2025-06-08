"use client";

import { motion } from "motion/react";
import { useState, useRef, useLayoutEffect } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { Highlight } from "@/components/ui/hero-highlight";

const EVENTS = [
  // Example events for June 2025
  { date: "2025-06-09", title: "SC09 Modelling Uncertainty", type: "class" },
  { date: "2025-06-09", title: "5 more", type: "more" },
  { date: "2025-06-10", title: "SC04 Sci and Tech for Health", type: "class" },
  { date: "2025-06-11", title: "SUTD Ultimate", type: "recurring" },
  { date: "2025-06-15", title: "Father's Day", type: "special" },
  { date: "2025-06-24", title: "5th Row Records", type: "event" },
  { date: "2025-06-30", title: "Singapore Armed Forces Day", type: "special" },
  { date: "2025-06-30", title: "SUTD Chess Club", type: "event" },
  // Add more events as needed
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthMatrix(year: number, month: number) {
  // Returns a 2D array of dates for the calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];
  let dayOfWeek = (firstDay.getDay() + 6) % 7; // Monday start
  for (let i = 0; i < dayOfWeek; i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

function getEventsForDate(dateStr: string) {
  return EVENTS.filter((e) => e.date === dateStr);
}

function Calendar() {
  // Month/year state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const todayRef = useRef<HTMLDivElement>(null);

  const matrix = getMonthMatrix(currentYear, currentMonth);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (calendarRef.current) {
      setCalendarHeight(calendarRef.current.offsetHeight);
    }
  }, [cardOpen, currentMonth, currentYear]);

  // Scroll to today if needed
  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDay(date);
    setCardOpen(true);
  };

  const closeCard = () => setCardOpen(false);

  const selectedDateStr = selectedDay ? selectedDay.toISOString().slice(0, 10) : "";
  const selectedEvents = selectedDay ? getEventsForDate(selectedDateStr) : [];

  // Get today's date in YYYY-MM-DD format
  const todayStr = today.toISOString().slice(0, 10);

  // Month navigation
  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };
  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTimeout(scrollToToday, 200); // Wait for calendar to update
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto mb-16 px-0 md:px-0">
      <motion.div
        className="flex w-full"
        animate={{
          marginRight: cardOpen ? 360 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          ref={calendarRef}
          className="flex-1 bg-white/60 backdrop-blur-md border border-white/40 p-6 md:p-10 rounded-2xl overflow-x-auto"
          style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 60%, rgba(240,240,255,0.5) 100%)'}}
        >
          <div className="flex items-end justify-between mb-6">
            <div className="flex flex-col">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-1">
                <Highlight className="px-3 py-0.5 rounded-md">Upcoming Events</Highlight>
              </h2>
              <span className="text-lg font-semibold text-neutral-500">{monthNames[currentMonth]} {currentYear}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-neutral-200 transition"><ChevronLeftIcon className="w-5 h-5" /></button>
              <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-neutral-200 transition"><ChevronRightIcon className="w-5 h-5" /></button>
              <button onClick={handleToday} className="ml-2 px-3 py-1 rounded-lg bg-[#800000] text-white font-semibold text-xs shadow hover:bg-[#a83232] transition">Today</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-sm font-semibold mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-neutral-400 font-bold text-center tracking-wide py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {matrix.flat().map((date, idx) => {
              const dateStr = date ? date.toISOString().slice(0, 10) : "";
              const events = date ? getEventsForDate(dateStr) : [];
              const isSelected = selectedDay && date && dateStr === selectedDateStr;
              const isToday = date && dateStr === todayStr && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
              return (
                <motion.div
                  key={idx}
                  ref={isToday ? todayRef : undefined}
                  className={
                    "min-h-[90px] md:min-h-[110px] bg-white/70 rounded-xl p-2 flex flex-col relative cursor-pointer transition-all" +
                    (date ? "" : " opacity-0 pointer-events-none") +
                    (isSelected ? " ring-2 ring-blue-400" : "")
                  }
                  style={{backdropFilter: 'blur(6px)'}}
                  whileHover={date ? { scale: 1.04, boxShadow: "0 4px 24px 0 rgba(80,120,255,0.08)" } : {}}
                  onClick={() => handleDayClick(date)}
                  tabIndex={date ? 0 : -1}
                >
                  {date && (
                    <span className={
                      "text-xs font-bold mb-1 select-none " +
                      (isToday ? "text-[#800000]" : "text-neutral-500")
                    }>
                      {date.getDate()}
                    </span>
                  )}
                  <div className="flex flex-col gap-1 flex-1">
                    {events.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={
                          "truncate px-2 py-1 rounded-lg shadow-sm text-xs font-medium cursor-pointer transition-all duration-150 " +
                          (event.type === "special"
                            ? "bg-green-200/80 text-green-900 hover:bg-green-300"
                            : event.type === "recurring"
                            ? "bg-purple-200/80 text-purple-900 hover:bg-purple-300"
                            : event.type === "class"
                            ? "bg-blue-200/80 text-blue-900 hover:bg-blue-300"
                            : "bg-neutral-200/80 text-neutral-800 hover:bg-neutral-300")
                        }
                        tabIndex={0}
                      >
                        {event.title}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-neutral-500 mt-1 cursor-pointer hover:underline">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
      {/* Event Card Popup */}
      <AnimatePresence>
        {cardOpen && selectedDay && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-1/2 right-8 z-50 w-[340px] max-w-[90vw] -translate-y-1/2 bg-white/80 backdrop-blur-lg border border-white/60 rounded-2xl shadow-lg p-6 flex flex-col gap-4"
            style={{boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)', height: calendarHeight ? calendarHeight : 'auto'}}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-neutral-900">
                {selectedDay.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <button onClick={closeCard} className="text-neutral-400 hover:text-neutral-700 text-xl font-bold px-2 py-1 rounded-full transition-all">&times;</button>
            </div>
            <div className="flex flex-col gap-2">
              {selectedEvents.length === 0 && (
                <div className="text-neutral-500 text-sm">No events for this day.</div>
              )}
              {selectedEvents.map((event, i) => (
                <div
                  key={i}
                  className={
                    "truncate px-3 py-2 rounded-lg text-sm font-medium " +
                    (event.type === "special"
                      ? "bg-green-200/80 text-green-900"
                      : event.type === "recurring"
                      ? "bg-purple-200/80 text-purple-900"
                      : event.type === "class"
                      ? "bg-blue-200/80 text-blue-900"
                      : "bg-neutral-200/80 text-neutral-800")
                  }
                >
                  {event.title}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 font-sans snap-y snap-mandatory overflow-y-auto h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 snap-start">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-[#800000] dark:text-[#ffb3b3] mb-6">
              Welcome to DiscoverSUTD
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Your gateway to exploring clubs, events, and opportunities at SUTD
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section id="upcoming-events" className="w-full px-2 md:px-6 snap-start">
        <Calendar />
      </section>

      {/* Today's Events Section */}
      <section id="todays-events" className="w-full px-2 md:px-6 py-12 snap-start">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Today's Events</h2>
          <TodaysEvents />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-neutral-50 dark:bg-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-lg"
            >
              <h3 className="text-xl font-semibold text-[#800000] dark:text-[#ffb3b3] mb-3">
                Discover Clubs
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Explore and join various clubs and organizations at SUTD
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-lg"
            >
              <h3 className="text-xl font-semibold text-[#800000] dark:text-[#ffb3b3] mb-3">
                Stay Updated
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Get the latest news and updates about campus events and activities
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-lg"
            >
              <h3 className="text-xl font-semibold text-[#800000] dark:text-[#ffb3b3] mb-3">
                Connect
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Connect with fellow students and club leaders
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-[#800000] dark:text-[#ffb3b3] mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
              Explore our clubs and events to find your perfect fit
            </p>
            <button className="px-8 py-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20">
              Browse Clubs
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function TodaysEvents() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todaysEvents = EVENTS.filter((e) => e.date === todayStr);
  if (todaysEvents.length === 0) {
    return <div className="text-neutral-500 text-base">No events for today.</div>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {todaysEvents.map((event, i) => (
        <li
          key={i}
          className={
            "px-4 py-3 rounded-lg text-base font-medium shadow-sm " +
            (event.type === "special"
              ? "bg-green-200/80 text-green-900"
              : event.type === "recurring"
              ? "bg-purple-200/80 text-purple-900"
              : event.type === "class"
              ? "bg-blue-200/80 text-blue-900"
              : "bg-neutral-200/80 text-neutral-800")
          }
        >
          {event.title}
        </li>
      ))}
    </ul>
  );
} 