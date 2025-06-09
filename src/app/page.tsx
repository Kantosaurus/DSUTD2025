"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Highlight } from "@/components/ui/hero-highlight";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
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
import { LoginModal } from "@/components/ui/login-modal";
import { SignupModal } from "@/components/ui/signup-modal";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const navItems = [
    { name: "Meet the team", link: "/about" },
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
          <div className="flex items-center gap-4">
            <NavbarButton onClick={() => setIsLoginModalOpen(true)}>
              Sign In
            </NavbarButton>
            <NavbarButton
              onClick={() => setIsSignupModalOpen(true)}
              className="bg-[#800000] text-white hover:bg-[#a83232]"
            >
              Sign Up
            </NavbarButton>
          </div>
        </NavBody>
      </Navbar>

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
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.link}
              className="block px-4 py-2 text-neutral-600 hover:text-neutral-900"
            >
              {item.name}
            </a>
          ))}
          <div className="px-4 py-2 space-y-2">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full px-4 py-2 text-neutral-600 hover:text-neutral-900"
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignupModalOpen(true)}
              className="w-full px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#a83232]"
            >
              Sign Up
            </button>
          </div>
        </MobileNavMenu>
      </MobileNav>

      <main>
        <HeroParallax products={products} />
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSignupClick={() => setIsSignupModalOpen(true)}
      />

      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />
    </div>
  );
}
