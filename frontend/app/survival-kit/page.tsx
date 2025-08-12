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
export default function SurvivalKitPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
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
  const survivalKitLoadingStates = [
    { text: "Checking authentication..." },
    { text: "Loading survival resources..." },
    { text: "Preparing your toolkit..." }
  ];
  const menuItems = [
    {
      title: "Connectivity &\nNavigation",
      image: "/images/connectivity-navigation.png",
      content: "SUTD provides multiple ways for students to connect to campus networks, access resources remotely, and find their way around.",
      quickResources: [
        {
          "title": "WiFi Setup Guide",
          "description": "Log into SUTD_Wifi using your MyPortal credentials:\n- Username: 100XXXX (Student ID)\n- Password: (Network ID password)\n\nGuides & Links:\n- Eduroam setup PDF: https://www.sutd.edu.sg/cmsresource/it/eduroam_setup.pdf\n- IT Service Desk Eduroam page: https://itservicedesk.sutd.edu.sg/index.php/2023/04/27/wireless-eduroam/"
        },
        {
          "title": "VPN",
          "description": "Required to access certain SUTD resources when off-campus.\nSteps:\n1. Go to http://itservicedesk.sutd.edu.sg\n2. Quick Links → Students → Student Downloads → '2. General' → '8. Ivanti Secure Access'\n3. Download and install Ivanti Secure Access for your device\n4. Add connection:\n   - Name: SUTD VPN connection\n   - Server: https://sutdvpn.sutd.edu.sg/remote\n5. Login with MyPortal credentials + Google Authenticator code\n\nGuide: https://itservicedesk.sutd.edu.sg/index.php/2023/04/17/vpn-ivantisecureaccess-installation-guide/"
        },
        {
          "title": "Campus Navigation",
          "description": "Tools:\n- @SUTDMapBot on Telegram → Find any room by number\n- 3D Campus Map (by students) → https://jingkai27.github.io/insight/#features"
        },
        {
          "title": "Room Number Format",
          "description": "How to read:\n- First digit = Building\n- Second digit = Level\n- Last digits = Room number\nExample: 1.308 → Building 1, Level 3, Room 8"
        }
      ]
    },
    {
      title: "Academic &\nCareer Tools",
      image: "/images/academic-career.png",
      content: "Access essential academic resources including course registration, grade portals, library services, and career development tools. Your one-stop guide for academic success at SUTD.",
      quickResources: [
        {
          "title": "MyPortal",
          "description": "Official school portal for administrative matters including timetable, fee payment, and academic transcripts. Login: https://myportal.sutd.edu.sg/"
        },
        {
          "title": "eDimension",
          "description": "Primary academic platform for lecture slides, homework submissions, quizzes, and online assessments. Login: https://edimension.sutd.edu.sg/"
        },
        {
          "title": "SUTD Career Portal (GEMS)",
          "description": "One-stop career services system to apply for jobs, book career advisory appointments, and sign up for workshops or recruitment events. Login: https://sutd-csm.symplicity.com/"
        },
        {
          "title": "Outlook Email",
          "description": "Official communication channel between students and the school. Email format: 100XXXX@mymail.sutd.edu.sg. Login: https://outlook.office.com/"
        },
        {
          "title": "LockDown Browser",
          "description": "Secure browser used for accessing certain quizzes and exams on eDimension. Download: https://download.respondus.com/lockdown/download.php?id=935444133"
        },
        {
          "title": "Other Academic Platforms",
          "description": "Additional tools used in some courses: Learning Catalytics, Ed Discussion, Piazza, Classpoint, and Gradescope."
        }
      ]
    },
    {
      title: "Booking & Using\nCampus Facilities",
      image: "/images/campus-facilities.png",
      content: "Learn how to book and utilize campus facilities including study rooms, sports facilities, maker spaces, and event venues. Maximize your use of SUTD's world-class facilities.",
      quickResources: [
        {
          "title": "FabLab Booking Portal",
          "description": "Book fabrication facilities like laser cutters and 3D printers after completing required training. Access via SUTD ED Booking Systems: https://edbooking.sutd.edu.sg/fablabbooking/Web/schedule.php?&sid=52"
        },
        {
          "title": "Library Resources & Room Booking",
          "description": "Access electronic resources and book discussion rooms. Portal: https://mylibrary.sutd.edu.sg/"
        },
        {
          "title": "IBMS Sports Booking",
          "description": "Book sports and recreation facilities. Email help-facilities@sutd.edu.sg for an account."
        },
        {
          "title": "Other Booking Platforms",
          "description": "Research Seating Management System and Academic Media Studio (training required) are also available for specific needs."
        },
        {
          "title": "Printing Facilities",
          "description": "Available at Hostel Quiet Rooms, Library, Pi Lab, and Plotter Room. Includes 2D/3D scanning and photocopying."
        },
        {
          "title": "Think Tanks & Study Spaces",
          "description": "Late Night Think Tank 21 (2.310) open daily 6:00 pm – 2:00 am."
        },
        {
          "title": "Sports & Recreation Centre",
          "description": "Includes swimming pool, gym, indoor and outdoor courts. Opening hours vary; check official schedules."
        },
        {
          "title": "Places to Chill",
          "description": "ROOT Cove (Building 2 Level 3) and Student Activity Centre (Building 5 Level 4) with board games, consoles, and lounge seating."
        },
        {
          "title": "Scrapyard",
          "description": "Student-initiated recycling space for unwanted but useful materials. Managed by Greenprint Club."
        }
      ]
    },
    {
      title: "Hostel Life",
      image: "/images/hostel-life.png",
      content: "SUTD's hostels provide on-campus living with communal spaces, events, and amenities. Staying connected with your floor community is essential for updates and meeting residency requirements.",
      quickResources: [
        {
          "title": "Floor Chats & House Guardians",
          "description": "Join your floor's chat group to receive updates on admin matters and events. Contact your floor's House Guardian if you are not in the group."
        },
        {
          "title": "Housing Portal",
          "description": "Manage housing applications, request maintenance, and make housing payments: https://hms.sutd.edu.sg/studentportal/Default.aspx"
        },
        {
          "title": "Aircon Credits",
          "description": "Top up and check aircon credits using credentials on your room access card. Telegram Bot: @evs_notification_bot"
        },
        {
          "title": "Door Knob Battery",
          "description": "If the door knob light blinks faint blue, request a battery change via the Housing Portal to prevent lockouts."
        },
        {
          "title": "Board Games Bot",
          "description": "Rent board games from the hostel lounge. Weekdays: 7:30pm–11:30pm, Weekends: 10am–10pm. Telegram Bot: @SUTDbg_bot"
        },
        {
          "title": "Visitor Registration",
          "description": "Register visitors (including SUTD students not staying in hostel) before bringing them in during hostel visiting hours."
        }
      ]
    },
    {
      title: "ROOT &\nStudent Services",
      image: "/images/root-student-services.png",
      content: "ROOT is SUTD's student government, supporting events, Fifth Row activities, student welfare, and community engagement. It also provides resources for organising events, managing finances, and connecting with fellow students.",
      quickResources: [
        {
          "title": "ROOT Website",
          "description": "Find resources and guidelines for starting events, publicising activities, and managing Fifth Row clubs. Access: https://root.sutd.edu.sg/"
        },
        {
          "title": "Fifth Row Directory",
          "description": "Explore all available Fifth Row clubs and communities: https://root.sutd.edu.sg/student-life/fifth-row-directory"
        },
        {
          "title": "Event & Finance Resources",
          "description": "Download documents for events, finance, IT help, and other guidelines: https://root.sutd.edu.sg/resources"
        },
        {
          "title": "Locker Booking",
          "description": "Book lockers for storing your items: https://root.sutd.edu.sg/locker-booking"
        },
        {
          "title": "Community Platforms",
          "description": "SUTD Family Telegram group, Facebook group, Reddit, Discord, and niche interest groups (e.g., vegetarian/vegan chat, international students, HASS minor discussions)."
        },
        {
          "title": "ROOT Feedback Bot",
          "description": "Voice your feedback and suggestions directly to ROOT via Telegram: @SUTD_ROOT_bot"
        },
        {
          "title": "ROOT Announcements Channel",
          "description": "Receive important admin details and event updates from ROOT."
        },
        {
          "title": "ROOT Social Media",
          "description": "Instagram: https://www.instagram.com/sutdlife/ | YouTube: https://www.youtube.com/channel/UCWQAI3RDoz_-cPHHr_4thcQ"
        }
      ]
    },
    {
      title: "Health &\nSafety",
      image: "/images/health-safety.png",
      content: "Stay safe and healthy on campus with information about medical services, emergency procedures, mental health resources, and safety protocols. Your wellbeing is our priority.",
      quickResources: [
        {
          "title": "Medical Coverage",
          "description": "All students are covered under the GroupCare Lite @Income insurance scheme. Sign up with your SUTD email (format: 100XXXX@mymail.sutd.edu.sg) and student ID."
        },
        {
          "title": "Nearest Clinics",
          "description": "Fullerton Health @ Watsons (Changi City Point) is closest; Central 24-HR Clinic (Tampines) for 24-hour service."
        },
        {
          "title": "Telemedicine Booth",
          "description": "Available 24/7 on campus near Albert Hong benches or next to Building 1 Lift."
        },
        {
          "title": "Leave of Absence (LOA)",
          "description": "For medical or approved personal reasons, inform your instructors and submit LOA via MyPortal > Self Service > Leave of Absence Application. Medical certificate required."
        },
        {
          "title": "Lost Student Card",
          "description": "Email help-facilities@sutd.edu.sg for a temporary access card ($10). FM Office is at Building 5 Level 1."
        },
        {
          "title": "Emergency Contacts",
          "description": "Campus Security (24/7): 6303 6666 | Hostel Security (24/7): 6499 4071"
        }
      ]
    },
    {
      title: "Food &\nSupper Hacks",
      image: "/images/food.png",
      content: "Discover the best food options on and around campus, late-night supper spots, food delivery hacks, and budget-friendly meal solutions. Never go hungry at SUTD!",
      quickResources: [
        {
          "title": "Hungrysia Group",
          "description": "Telegram group for group-buy food orders and bulk delivery coordination. Current Boss: @S_jean"
        },
        {
          "title": "Vegetarian/Vegan Chat",
          "description": "Telegram group for vegetarians and vegans to share meal options and food tips."
        },
        {
          "title": "Nearby Eats",
          "description": "Ananda Bhavan (vegetarian), Domino's, Gomgom sandwiches, and the Indian stall (when open) are common go-tos."
        },
        {
          "title": "Late Night Snacks",
          "description": "Coordinate with peers for food runs or use group-buy chats to get deliveries during study sessions."
        }
      ]
    },
    {
      title: "Finance &\nClaims",
      image: "/images/finance-claims.png",
      content: "Understand financial procedures, claim processes, scholarship information, and budget management tips. Make your money work smarter during your SUTD journey.",
      quickResources: [
        {
          "title": "Grants, Bursaries & Scholarships",
          "description": "For enquiries, contact studentfinance@sutd.edu.sg or call 6303 6888."
        },
        {
          "title": "Student Claims (Clubs, Events, Projects)",
          "description": "Submit claims through Concur at https://www.concursolutions.com/nui/signin using your 100XXXX@mymail.sutd.edu.sg and EASE credentials."
        },
        {
          "title": "Finance Guidelines",
          "description": "Download the latest finance guidelines from ROOT's resources page before making purchases: https://root.sutd.edu.sg/resources"
        },
        {
          "title": "Approval & Clarifications",
          "description": "Seek confirmation from your StuOrg Treasurer before committing to any expenses to ensure they meet reimbursement requirements."
        }
      ]
    },
    {
      title: "Contacts &\nHotlines",
      image: "/images/contacts-hotlines.png",
      content: "Essential contact information for all SUTD services, emergency hotlines, department contacts, and who to call when you need help. Keep these numbers handy!",
      quickResources: [
        {
          "title": "IT Service Desk",
          "description": "Email help-it@sutd.edu.sg (24h) or call 6499 4500 (Mon–Fri: 8am–10pm, Sat: 8:30am–1pm). Walk-in: IT Care @ 2.204 (Building 2 Level 4)."
        },
        {
          "title": "Educational Technology",
          "description": "Support for eDimension, online exams, course evaluation, Academic Media Studio, and more. Email edi_admin@sutd.edu.sg (Mon–Fri: 8:30am–5:30pm)."
        },
        {
          "title": "Finance Enquiries",
          "description": "Email studentfinance@sutd.edu.sg or call 6303 6888."
        },
        {
          "title": "Campus Facilities",
          "description": "Call 6303 6699."
        },
        {
          "title": "Campus Security (24/7)",
          "description": "Call 6303 6666."
        },
        {
          "title": "Hostel Security (24/7)",
          "description": "Call 6499 4071."
        },
        {
          "title": "Hostel Communal Facilities",
          "description": "For issues like dryers, call 6434 8225."
        },
        {
          "title": "ROOT President",
          "description": ""
        },
        {
          "title": "",
          "description": ""
        },
        {
          "title": "",
          "description": ""
        }
      ]
    },
    {
      title: "Extras &\nPerks",
      image: "/images/extras-perks.png",
      content: "Unlock hidden perks, student discounts, special programs, and lesser-known benefits available to SUTD students. Make the most of your student status!",
      quickResources: [
        {
          "title": "Economist Subscription",
          "description": "Free access to The Economist app and newsletter using your SUTD email. Sign up: https://myaccount.economist.com/s/login/SelfRegister"
        },
        {
          "title": "Self-Service Recording Studio",
          "description": "Located at SUTD Library Level 3. Book via https://mylibrary.sutd.edu.sg/bookable-room-dr-l3-32 or use Outlook links for video/audio studios."
        },
        {
          "title": "Word of Mouth Lobangs",
          "description": "polymate.tech for filament, fasteners, electronics, wires, and after-hours printing & laser services."
        },
        {
          "title": "Interesting 3D Prints",
          "description": "Download hostel wallet and card holder model by Joel, Class of 2025: https://www.printables.com/model/1009157-sutd-hostel-wallet-and-card-holder"
        },
        {
          "title": "Study Tips",
          "description": "Write notes to improve retention, type notes to organise thoughts. Recommended apps: GoodNotes, Notability, OneNote, Notion (free education account)."
        },
        {
          "title": "GitHub Education",
          "description": "Free suite of developer tools including GitHub Copilot. Remember to disable code-sharing permissions if required by your course."
        }
      ]
    }
  ];
  const handleBoxClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brown-50 to-indigo-100">
        <MultiStepLoader
          loadingStates={survivalKitLoadingStates}
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
                      {menuItems[expandedIndex].quickResources.map((resource, resourceIndex) => (
                        <div key={resourceIndex} className="bg-white/50 rounded-xl p-4">
                          <h4 style={{ color: '#631D35' }} className="font-semibold mb-2">{resource.title}</h4>
                          <p style={{ color: '#631D35' }} className="whitespace-pre-line 70 text-sm">{resource.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ backgroundColor: '#631D35' }}
                      className="px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 hover:brightness-110"
                    >
                      Access Resources
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ color: '#631D35', borderColor: '#631D35' }}
                      className="px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 hover:bg-black hover:bg-opacity-10"
                    >
                      View Guides
                    </motion.button>
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
