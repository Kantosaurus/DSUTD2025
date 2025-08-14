'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CompleteNavbar } from '../../components/ui/resizable-navbar'
import { MultiStepLoader } from '../../components/ui/multi-step-loader'
import { LinkPreview } from '../../components/ui/link-preview'
import axios from 'axios'
const navItems = [
  { name: 'Home', link: '/home' },
  { name: 'Events', link: '/calendar' },
  { name: 'Survival Kit', link: '/survival-kit' },
  { name: 'Maps', link: '/maps' },
  { name: 'Team', link: '/meet-the-team' },
  { name: 'Admin Events', link: '/admin/events' },
  { name: 'Admin Logs', link: '/admin/logs' }
]
interface SurvivalKitItem {
  id: number;
  title: string;
  image: string;
  content: string;
  quickResources: {
    title: string;
    description: string;
  }[];
}

export default function SurvivalKitPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [menuItems, setMenuItems] = useState<SurvivalKitItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Helper function to render text with clickable links
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <LinkPreview key={index} url={part} className="font-bold cursor-pointer text-[#631D35]">
            <a href={part} target="_blank" rel="noopener noreferrer" className="font-bold text-[#631D35]">
              {part}
            </a>
          </LinkPreview>
        );
      }
      return part;
    });
  };
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
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
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUserRole(data.user.role || 'student');
          
          // Load survival kit data
          await loadSurvivalKitData(token);
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
    checkAuthAndLoadData();
  }, [router])

  const loadSurvivalKitData = async (token: string) => {
    try {
      setDataLoading(true);
      const response = await axios.get(`${API_URL}/api/survival-kit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform the data to match the expected format
      const transformedData = response.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        image: item.image_url,
        content: item.content,
        quickResources: item.quick_resources.map((resource: any) => ({
          title: resource.title,
          description: resource.description
        }))
      }));
      
      setMenuItems(transformedData);
    } catch (error) {
      console.error('Error loading survival kit data:', error);
      // Fallback to empty array if loading fails
      setMenuItems([]);
    } finally {
      setDataLoading(false);
    }
  };
  const survivalKitLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Loading survival resources..." },
    { text: "Preparing your toolkit..." }
  ];
  const handleBoxClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brown-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={survivalKitLoadingStates}
          loading={isLoading || dataLoading}
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
    <div className="min-h-screen from-slate-50 via-brown-50 to-indigo-100 bg-white">
      <CompleteNavbar navItems={navItems} userRole={userRole} />
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with Logo */}
          {expandedIndex === null && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mx-auto mb-6 flex items-center justify-center"
              >
                <div className="p-6">
                  <img
                    src="/survivalKitLogo.png"
                    className="w-[800px] h-auto max-h-[240px] object-contain mx-auto"
                    alt="DSUTD Survival Kit Logo"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const nextElement = target.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-3xl font-bold text-gray-900 mb-2"
              >
                Welcome to DSUTD
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-gray-600 text-lg"
              >
                Your gateway to campus resources and services <br />click on a box to learn more!
              </motion.p>
            </motion.div>
          )}
          {/* Menu Grid / Expanded View */}
          <div className="w-full">
            {expandedIndex !== null ? (
              // Expanded view - takes majority of page
              <motion.div
                key={`expanded-${expandedIndex}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-6xl mx-auto bg-white/70 rounded-3xl p-8 shadow-2xl backdrop-blur-md border border-white/50"
              >
                <div className="flex justify-between items-start mb-8">
                  <motion.h2
                    className="font-bold text-4xl leading-tight"
                    style={{ color: '#631D35' }}
                    initial={{ x: -20 }}
                    animate={{ x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {menuItems[expandedIndex].title.replace('\n', ' ')}
                  </motion.h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setExpandedIndex(null)}
                    style={{ color: '#631D35' }}
                    className="text-3xl font-bold hover:bg-white/50 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-200"
                  >
                    ×
                  </motion.button>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <p className="80 text-lg leading-relaxed" style={{ color: '#631D35' }}>
                    {menuItems[expandedIndex].content}
                  </p>
                  <div className="border-t border-brown-900/20 pt-6">
                    <h3 style={{ color: '#631D35' }} className="font-semibold text-xl mb-4">Quick Resources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {menuItems[expandedIndex]?.quickResources?.map((resource, resourceIndex) => (
                        <div key={resourceIndex} className="bg-white/50 rounded-xl p-4">
                          <h4 style={{ color: '#631D35' }} className="font-semibold mb-2">{resource.title}</h4>
                          <div style={{ color: '#631D35' }} className="whitespace-pre-line text-sm">
                            {renderTextWithLinks(resource.description)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              // Grid view - original boxes with images
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.1,
                        ease: "easeOut",
                        delay: index * 0.05
                      }}
                      whileHover={{
                        scale: 1.03,
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{
                        scale: 0.98,
                        transition: { duration: 0.1 }
                      }}
                      onClick={() => handleBoxClick(index)}
                      className="bg-white/60 rounded-2xl p-6 h-56 flex flex-col justify-between cursor-pointer border border-white shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-opacity-80 relative">

                      {/* Title at the top */}
                      <motion.h3
                        style={{ color: '#631D35' }}
                        className="font-bold text-base leading-tight z-10"
                        whileHover={{
                          scale: 1.02,
                          transition: { duration: 0.2 }
                        }}>
                        {item.title.split('\n').map((line, lineIndex) => (
                          <React.Fragment key={lineIndex}>
                            {line}
                            {lineIndex < item.title.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </motion.h3>

                      {/* Placeholder Image in center */}
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                        <img
                          src={item.image}
                          alt={item.title.replace('\n', ' ')}
                          className="w-40 h-40 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Hide broken image and show a fallback icon or nothing
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Bottom Spacing */}
          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
}
