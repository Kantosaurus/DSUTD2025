"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import React, { useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { MultiStepLoader } from './multi-step-loader';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'event' | 'survival_kit' | 'survival_resource';
  id: number;
  title: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
  location?: string;
  color?: string;
  image_url?: string;
  parent_title?: string;
  parent_id?: number;
  resources?: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed inset-x-0 top-0 z-40 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px)" : "blur(10px)",
        boxShadow: visible
          ? "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2) inset"
          : "0 4px 16px rgba(0, 0, 0, 0.05)",
        width: visible ? "80%" : "100%",
        y: visible ? 20 : 0,
        padding: visible ? "8px 16px" : "16px 24px",
        borderWidth: visible ? "1px" : "0px",
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      style={{
        minWidth: visible ? "600px" : "800px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-6xl flex-row items-center justify-between self-start lg:flex",
        "bg-red-900/60 backdrop-blur-lg rounded-2xl my-2 shadow-lg",
        visible && "bg-red-900/70 backdrop-blur-xl border border-red-800/50 shadow-xl",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const pathname = usePathname(); // Works in Next.js

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "hidden flex-row items-center space-x-4 text-sm font-semibold text-white transition duration-200 lg:flex lg:space-x-4",
        className,
      )}
    >
      {items.map((item, idx) => {
        const isActive = pathname === item.link;

        return (
          <a
            key={`link-${idx}`}
            href={item.link}
            onMouseEnter={() => setHovered(idx)}
            onClick={onItemClick}
            className={cn(
              "relative px-4 py-3 transition-all duration-200 text-shadow-sm",
              isActive
                ? "bg-white/20 text-white rounded-full font-bold shadow-inner"
                : "text-white hover:text-gray-100 hover:bg-white/10 rounded-full"
            )}
          >
            {/* Only show hover background if not already active */}
            {hovered === idx && !isActive && (
              <motion.div
                layoutId="hovered"
                className="absolute inset-0 h-full w-full rounded-full bg-white/15 shadow-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative z-20">{item.name}</span>
          </a>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px)" : "blur(10px)",
        boxShadow: visible
          ? "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2) inset"
          : "0 4px 16px rgba(0, 0, 0, 0.05)",
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "4px" : "2rem",
        y: visible ? 20 : 0,
        padding: visible ? "8px 16px" : "16px 24px",
        borderWidth: visible ? "1px" : "0px",
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-4rem)] flex-col items-center justify-between lg:hidden",
        "bg-red-900/60 backdrop-blur-lg rounded-2xl my-2 shadow-lg",
        visible && "bg-red-900/70 backdrop-blur-xl border border-red-800/50 shadow-xl",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg px-4 py-8",
            "bg-white/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,_0,_0,_0.1),_0_0_0_1px_rgba(255,_255,_255,_0.2)_inset]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return isOpen ? (
    <IconX className="text-white drop-shadow-md hover:text-gray-200 transition-colors duration-200" onClick={onClick} />
  ) : (
    <IconMenu2 className="text-white drop-shadow-md hover:text-gray-200 transition-colors duration-200" onClick={onClick} />
  );
};

export const NavbarLogo = () => {
  return (
    <a
      href="/home"
      className="relative z-20 mr-4 flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-white drop-shadow-md"
    >
      <img
        src="/dsutd.png"
        alt="DSUTD Logo"
        width={70}
        height={70}
        className="object-contain"
      />
    </a>
  );
};

export const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://';
      const response = await fetch(`${API_URL}/api/public-search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'event':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'survival_kit':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'survival_resource':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    
    switch (result.type) {
      case 'event':
        window.location.href = '/calendar';
        break;
      case 'survival_kit':
      case 'survival_resource':
        window.location.href = '/survival-kit';
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative group" ref={searchInputRef}>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        {isSearching ? (
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        ) : (
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </div>
      <input
        type="text"
        placeholder="Search events, survival kit..."
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={() => {
          if (searchResults.length > 0) {
            setShowResults(true);
          }
        }}
        className="w-8 h-8 bg-white/30 text-white border border-white/40 rounded-full focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-white/60 placeholder-gray-200 pl-3 pr-10 transition-all duration-300 group-hover:w-64 group-hover:rounded-lg group-focus-within:w-64 group-focus-within:rounded-lg shadow-lg"
      />
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 border-b">
              Found {searchResults.length} results for "{searchQuery}"
            </div>
            {searchResults.map((result, index) => (
              <div
                key={`${result.type}-${result.id}-${index}`}
                onClick={() => handleResultClick(result)}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getResultIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </h4>
                    {result.type === 'event' && result.event_date && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatEventDate(result.event_date)}
                      </span>
                    )}
                  </div>
                  {result.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {result.description.length > 80
                        ? `${result.description.substring(0, 80)}...`
                        : result.description}
                    </p>
                  )}
                  {result.parent_title && (
                    <p className="text-xs text-blue-600 mt-1">
                      in {result.parent_title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 capitalize">
                      {result.type === 'survival_resource' ? 'survival kit resource' : result.type}
                    </span>
                    {result.type === 'event' && result.event_type && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.event_type === 'Mandatory' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {result.event_type}
                        </span>
                      </>
                    )}
                    {result.type === 'event' && result.location && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{result.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AvatarDropdown = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on component mount
  React.useEffect(() => {
    const checkAuth = async () => {
      // Add a small delay to ensure localStorage is updated after login/signup
      await new Promise(resolve => setTimeout(resolve, 100));

      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with backend
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, assume not authenticated
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false);
    // Redirect to login page
    router.push('/')
  }

  const authLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Validating session..." }
  ];

  if (isLoading) {
    return (
      <div className="relative group">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 animate-pulse">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 ${
          isAuthenticated
            ? 'bg-gray-600 hover:bg-gray-500'
            : 'bg-gray-400 hover:bg-gray-300'
        }`}
        onClick={() => {
          if (isAuthenticated) {
            console.log('Navbar - Avatar clicked, navigating to profile page');
            router.push('/profile');
          } else {
            console.log('Navbar - Avatar clicked, user not authenticated');
            // Instead of alert and redirect to landing page, just redirect to landing page
            // The landing page has the login form
            router.push('/');
          }
        }}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-2">
          <a
            href="/profile"
            className={`flex items-center px-4 py-2 text-sm transition-colors duration-150 ${
              isAuthenticated
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (isAuthenticated) {
                console.log('Navbar - Navigating to profile page');
                router.push('/profile');
              } else {
                console.log('Navbar - User not authenticated');
                // Instead of alert and redirect to landing page, just redirect to landing page
                // The landing page has the login form
                router.push('/');
              }
            }}
          >
            <svg
              className="w-4 h-4 mr-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Profile
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
          >
            <svg
              className="w-4 h-4 mr-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export const MobileSearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);

  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://';
      const response = await fetch(`${API_URL}/api/public-search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'event':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'survival_kit':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'survival_resource':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    
    switch (result.type) {
      case 'event':
        window.location.href = '/calendar';
        break;
      case 'survival_kit':
      case 'survival_resource':
        window.location.href = '/survival-kit';
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative mb-4" ref={mobileSearchRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <svg
              className="h-4 w-4 text-white drop-shadow-sm"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
        <input
          type="text"
          placeholder="Search events, survival kit..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className="w-full px-4 py-3 pl-10 bg-white/30 text-white border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-white/60 placeholder-gray-200 shadow-lg backdrop-blur-sm"
        />
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 border-b">
              Found {searchResults.length} results for "{searchQuery}"
            </div>
            {searchResults.map((result, index) => (
              <div
                key={`mobile-${result.type}-${result.id}-${index}`}
                onClick={() => handleResultClick(result)}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getResultIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </h4>
                    {result.type === 'event' && result.event_date && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatEventDate(result.event_date)}
                      </span>
                    )}
                  </div>
                  {result.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {result.description.length > 60
                        ? `${result.description.substring(0, 60)}...`
                        : result.description}
                    </p>
                  )}
                  {result.parent_title && (
                    <p className="text-xs text-blue-600 mt-1">
                      in {result.parent_title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 capitalize">
                      {result.type === 'survival_resource' ? 'survival kit resource' : result.type}
                    </span>
                    {result.type === 'event' && result.event_type && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.event_type === 'Mandatory' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {result.event_type}
                        </span>
                      </>
                    )}
                    {result.type === 'event' && result.location && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500 truncate">{result.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const RightSection = () => {
  return (
    <div className="flex items-center space-x-4">
      <SearchBar />
      <AvatarDropdown />
    </div>
  );
};

export const CompleteNavbar = ({
  navItems,
  userRole = 'student'
}: {
  navItems: Array<{ name: string; link: string }>;
  userRole?: 'admin' | 'student' | 'club';
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => {
    // Show all items for admin users
    if (userRole === 'admin') {
      return true;
    }
    
    // For club users, show club items and hide admin items
    if (userRole === 'club') {
      // Hide admin items but show club-specific items
      return !item.name.toLowerCase().includes('admin') || item.name.toLowerCase().includes('my events');
    }
    
    // For regular students, hide admin and club-specific items
    return !item.name.toLowerCase().includes('admin') && !item.name.toLowerCase().includes('my events');
  });

  return (
    <Navbar className="sticky top-0 z-50">
      {/* Desktop Navigation */}
             <NavBody>
         <div className="flex items-center w-full">
           <div className="flex items-center flex-shrink-0">
             <NavbarLogo />
           </div>
           <div className="flex-1 flex justify-center px-4">
             <NavItems items={filteredNavItems} />
           </div>
           <div className="flex items-center flex-shrink-0">
             <RightSection />
           </div>
         </div>
       </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <MobileSearchBar />
          {filteredNavItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={() => setIsMobileMenuOpen(false)}
                             className="relative text-white hover:text-gray-100 py-3 px-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium"
            >
              <span className="block">{item.name}</span>
            </a>
          ))}
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-4 py-2 rounded-md bg-white button bg-white text-black text-sm font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center";

  const variantStyles = {
    primary:
      "shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    secondary: "bg-transparent shadow-none dark:text-white",
    dark: "bg-black text-white shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    gradient:
      "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
