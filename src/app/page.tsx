"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton,
} from "@/components/ui/resizable-navbar";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { useState } from "react";
import { SignupModal } from "@/components/ui/signup-modal";
import { LoginModal } from "@/components/ui/login-modal";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navItems = [
    { name: "Home", link: "#" },
    { name: "Meet the team", link: "#team" },
  ];

  const products = [
    {
      title: "Architecture and Sustainable Design",
      link: "https://www.sutd.edu.sg/asd/",
      thumbnail: "/ASD.jpeg",
    },
    {
      title: "Computer Science and Design",
      link: "https://www.sutd.edu.sg/istd",
      thumbnail: "/CSD.jpeg",
    },
    {
      title: "Engineering Systems and Design",
      link: "https://www.sutd.edu.sg/esd/",
      thumbnail: "/ESD.jpeg",
    },
    {
      title: "Engineering Product Development",
      link: "https://www.sutd.edu.sg/epd/",
      thumbnail: "/EPD.jpeg",
    },
    {
      title: "Design and Artificial Intelligence",
      link: "https://www.sutd.edu.sg/dai/",
      thumbnail: "/DAI.jpeg",
    },
    {
      title: "Singapore University of Technology and Design",
      link: "https://www.sutd.edu.sg/",
      thumbnail: "/SUTD.png",
    },
    {
      title: "Humanities, Arts, and Social Sciences",
      link: "https://www.sutd.edu.sg/hass/",
      thumbnail: "/HASS.jpeg",
    },
    {
      title: "ROOT",
      link: "https://root.sutd.edu.sg/",
      thumbnail: "/SAC_placeholder.webp",
    },
    {
      title: "Student Association Constitution",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/ROOT.png",
    },
    {
      title: "Sports",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/Sports.jpg",
    },
    {
      title: "Makers",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/Makers.webp",
    },
    {
      title: "Community",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/Community.webp",
    },
    {
      title: "Arts",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/Arts.webp",
    },
    {
      title: "Culture",
      link: "https://root.sutd.edu.sg/student-life/stu-org-directory",
      thumbnail: "/Culture.webp",
    },
    {
      title: "OpenSUTD",
      link: "https://opensutd.org/",
      thumbnail: "/OpenSUTD.png",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex gap-2">
            <NavbarButton variant="secondary" onClick={() => setIsLoginModalOpen(true)}>Login</NavbarButton>
            <NavbarButton variant="primary" onClick={() => setIsSignupModalOpen(true)}>Join us!</NavbarButton>
          </div>
        </NavBody>
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
            {navItems.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
      <main>
        <HeroParallax products={products} />
      </main>
      <SignupModal 
        isOpen={isSignupModalOpen} 
        onClose={() => setIsSignupModalOpen(false)} 
        onLoginClick={() => setIsLoginModalOpen(true)}
      />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onSignupClick={() => setIsSignupModalOpen(true)}
      />
    </div>
  );
}
