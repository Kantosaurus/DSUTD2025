'use client'

import React, { useEffect, useState } from 'react'

// Extend Window interface to include Leaflet
declare global {
  interface Window {
    L: any;
  }
}
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

// SUTD 3D Map Component
const SUTDMap = () => {
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Load CSS first
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
        link.onload = () => console.log('Leaflet CSS loaded')
        document.head.appendChild(link)
      }

      // Load JS and wait for it to be ready
      if (!window.L) {
        return new Promise<void>((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
          script.onload = () => {
            console.log('Leaflet JS loaded')
            // Small delay to ensure everything is ready
            setTimeout(() => {
              initializeMap()
              resolve()
            }, 100)
          }
          document.head.appendChild(script)
        })
      } else {
        initializeMap()
      }
    }

    const initializeMap = () => {
      // SUTD coordinates
      const sutdCoords = [1.3417, 103.9634] // SUTD Singapore coordinates

      // Initialize map with explicit interaction options
      const map = window.L.map('sutd-map', {
        center: sutdCoords,
        zoom: 17,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
        tap: true
      })

      // Add clean OpenStreetMap style like your reference image
      const osmLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      })

      osmLayer.addTo(map)

      // SUTD Buildings and Points of Interest (based on actual campus layout)
      const sutdBuildings = [
        {
            name: "Building 5 – Fab Lab & Admin",
            coords: [1.34164, 103.96271],
            description: "Admin offices + Fab Lab cluster (B5).",

          },
          {
            name: "Building 2 (Campus Centre)",
            coords: [1.340784, 103.962542],
            description: "Campus Centre; main concourse linking B1–B3."
          },
          {
            name: "Building 1 (Academic & Library)",
            coords: [1.340214, 103.962462],
            description: "Lecture theatres & library block."
          },
          {
            name: "Campus Centre & Canteen",
            coords: [1.34105, 103.96302],
            description: "Level 2 canteen inside Campus Centre."
          },
          {
            name: "Library",
            coords: [1.340197, 103.962836],
            description: "SUTD Library @ L1 (approximately entrance area)."
          },
          {
            name: "Gomgom (B2 #01-202A)",
            coords: [1.340784, 103.962542],
            description: "Halal customizable sandwiches and rice bowls."
          },
          {
            name: "Cheers (B2 #01-201)",
            coords: [1.340784, 103.962542],
            description: "Convenience store at L1 facing D’Star and next to Gomgom."
          },
          {
            name: "Mala (Canteen stall)",
            coords: [1.34105, 103.96302],
            description: "Canteen L2; vendor lineup can change."
          },
          {
            name: "D’Star Bistro (B1 #01-102)",
            coords: [1.34043, 103.96257],
            description: "Bistro facing Campus Centre and next to Albert hong."
          },
          {
            name: "Hostel Buildings (Student Housing)",
            coords: [1.34213, 103.96419],
            description: "SUTD Student Housing cluster (representative point)."
          },
          {
            name: "Sports Complex & Recreational Centre",
            coords: [1.34161, 103.96486],
            description: "SUTD Multifunction Sport Center (tennis, halls, etc.)."
          }

      ]

      // Add building markers with working popups (using simple marker approach like your example)
      sutdBuildings.forEach((building, index) => {
        // Create a simple marker (like in your example)
        const marker = window.L.marker(building.coords)

        // Add to map and bind popup (exactly like your example)
        marker.addTo(map)
          .bindPopup(`
            <div style="text-align: center; padding: 8px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px; font-weight: bold;">${building.name}</h3>
              <p style="margin: 0; color: #7f8c8d; font-size: 14px;">${building.description}</p>
            </div>
          `)

        // Optional: Open the first popup by default (like in your example)
        if (index === 0) {
          marker.openPopup()
        }
      })

      // Add correct campus boundary based on actual SUTD layout
      const campusBoundary = [
        [1.344, 103.9628], // North-west corner
        [1.3435, 103.965], // North-east corner
        [1.3398, 103.9648], // South-east corner
        [1.34, 103.9615], // South-west corner
        [1.3425, 103.9620]  // Close the polygon
      ]

      window.L.polygon(campusBoundary, {
        color: '#2196F3',
        weight: 2,
        opacity: 0.7,
        fillColor: '#2196F3',
        fillOpacity: 0.05,
        dashArray: '8, 8'
      }).addTo(map)

      // Add modern info panel
      const info = window.L.control({ position: 'bottomright' })
      info.onAdd = function() {
        const div = window.L.DomUtil.create('div', 'info-panel')
        div.innerHTML = `
          <div style="
            background: rgba(255,255,255,0.98);
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            border: 1pvx solid #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <h4 style="
              margin: 0 0 8px 0;
              color: #1976D2;
              font-size: 16px;
              font-weight: 600;
            ">
              SUTD Campus
            </h4>
            <p style="
              margin: 0;
              color: #666;
              font-size: 13px;
              line-height: 1.4;
            ">
              Click markers for building info
            </p>
          </div>
        `
        return div
      }
      info.addTo(map)

      // Add clean, modern CSS styling
      const style = document.createElement('style')
      style.textContent = `
        .building-marker {
          transition: all 0.2s ease;
          cursor: pointer !important;
        }

        .building-marker:hover {
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }

        .leaflet-interactive {
          cursor: pointer !important;
        }

        .leaflet-container {
          cursor: grab !important;
        }

        .leaflet-container:active {
          cursor: grabbing !important;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid #e0e0e0;
          padding: 0;
        }

        .leaflet-popup-content {
          margin: 0;
        }

        .leaflet-popup-tip {
          border-top-color: #e0e0e0 !important;
        }

        .custom-popup .leaflet-popup-close-button {
          color: #999 !important;
          font-size: 18px !important;
          padding: 8px !important;
        }

        #sutd-map {
          border-radius: 0;
          box-shadow: none;
          border: none;
          position: relative;
          z-index: 1;
        }

        .leaflet-control-zoom a {
          background-color: white !important;
          border: 1px solid #ccc !important;
          color: #666 !important;
        }

        .leaflet-control-zoom a:hover {
          background-color: #f5f5f5 !important;
          border-color: #999 !important;
        }

        /* Ensure all map elements stay below navbar */
        .leaflet-control-container,
        .leaflet-popup,
        .leaflet-tooltip {
          z-index: 1000 !important;
        }

        .leaflet-marker-pane,
        .leaflet-tile-pane,
        .leaflet-overlay-pane {
          z-index: 100 !important;
        }

        /* Style navbar for maps page overlay */
        .absolute.top-0 nav {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(10px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
      `
      document.head.appendChild(style)

      setMapLoaded(true)
    }

    loadLeaflet()

    return () => {
      // Cleanup
      const mapContainer = document.getElementById('sutd-map')
      if (mapContainer) {
        (mapContainer as any)._leaflet_id = null
      }
    }
  }, [])

  return (
    <motion.div
      className="w-full h-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div
        id="sutd-map"
        className="w-full h-full"
        style={{
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-blue-600 font-medium">Loading SUTD Campus Map...</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

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
        // No token - allow viewing maps without authentication
        setIsAuthenticated(false)
        setUserRole('student')
        setIsLoading(false)
        return
      }

      try {
        // Validate token with backend
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
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
          // Token is invalid, clear it and allow public viewing
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUserRole('student');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, clear token and allow public viewing
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUserRole('student');
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

  // Allow access for both authenticated and non-authenticated users

  return (
    <div className="h-screen bg-white overflow-hidden relative">
      {/* Navbar positioned over the map */}
      <div className="absolute top-0 left-0 right-0 z-50" style={{ zIndex: 9999 }}>
        <CompleteNavbar navItems={navItems} userRole={userRole} />
      </div>

      {/* Fullscreen map */}
      <div className="h-screen w-full">
        <SUTDMap />
      </div>
    </div>
  );
}
