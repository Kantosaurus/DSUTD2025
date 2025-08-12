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
        return new Promise((resolve) => {
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
          name: "Building 1 (Academic)",
          coords: [1.3415, 103.9635],
          description: "Main academic building with lecture halls and labs",
          color: "#FF6B6B"
        },
        {
          name: "Building 2 (Library)",
          coords: [1.3413, 103.9633],
          description: "SUTD Library and study spaces",
          color: "#4ECDC4"
        },
        {
          name: "Building 3 (Academic)",
          coords: [1.3408, 103.9635],
          description: "Academic facilities and classrooms",
          color: "#45B7D1"
        },
        {
          name: "Building 5 (Admin)",
          coords: [1.3420, 103.9640],
          description: "Administrative offices",
          color: "#96CEB4"
        },
        {
          name: "Fabrication Lab",
          coords: [1.3412, 103.9638],
          description: "Digital fabrication and prototyping lab",
          color: "#FCEA2B"
        },
        {
          name: "SUTD Sports Field",
          coords: [1.3405, 103.9642],
          description: "Sports facilities and recreational area",
          color: "#FF8E53"
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
        [1.3425, 103.9628], // North-west corner
        [1.3425, 103.9648], // North-east corner
        [1.3400, 103.9648], // South-east corner
        [1.3400, 103.9628], // South-west corner
        [1.3425, 103.9628]  // Close the polygon
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
      const info = window.L.control({ position: 'topright' })
      info.onAdd = function() {
        const div = window.L.DomUtil.create('div', 'info-panel')
        div.innerHTML = `
          <div style="
            background: rgba(255,255,255,0.98);
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            border: 1px solid #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <h4 style="
              margin: 0 0 8px 0;
              color: #1976D2;
              font-size: 16px;
              font-weight: 600;
            ">
              🏫 SUTD Campus
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
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
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
      `
      document.head.appendChild(style)

      setMapLoaded(true)
    }

    loadLeaflet()

    return () => {
      // Cleanup
      const mapContainer = document.getElementById('sutd-map')
      if (mapContainer) {
        mapContainer._leaflet_id = null
      }
    }
  }, [])

  return (
    <motion.div
      className="w-full h-96 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div
        id="sutd-map"
        className="w-full h-full"
        style={{
          minHeight: '400px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-15">
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

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to SUTD</h1>
          <p className="text-gray-600 text-lg">Explore the campus with this map</p>
        </motion.div>

        <SUTDMap />

        <motion.div
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
        </motion.div>
      </div>
    </div>
  );
}
