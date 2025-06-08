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

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { name: "Home", link: "#" },
    { name: "About", link: "#about" },
    { name: "Services", link: "#services" },
    { name: "Contact", link: "#contact" },
  ];

  const products = [
    {
      title: "Architecture and Sustainable Design",
      link: "#asd",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/moonbeam.png",
    },
    {
      title: "Engineering Product Development",
      link: "#epd",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/cursor.png",
    },
    {
      title: "Engineering Systems and Design",
      link: "#esd",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/rogue.png",
    },
    {
      title: "Information Systems Technology and Design",
      link: "#istd",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/editorially.png",
    },
    {
      title: "Computer Science and Design",
      link: "#csd",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/editrix.png",
    },
    {
      title: "Design Innovation",
      link: "#di",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/pixelperfect.png",
    },
    {
      title: "Artificial Intelligence",
      link: "#ai",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/algochurn.png",
    },
    {
      title: "Digital Manufacturing",
      link: "#dm",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/aceternityui.png",
    },
    {
      title: "Urban Science",
      link: "#us",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/tailwindmasterkit.png",
    },
    {
      title: "Engineering Systems",
      link: "#es",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/smartbridge.png",
    },
    {
      title: "Information Systems",
      link: "#is",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/renderwork.png",
    },
    {
      title: "Computer Science",
      link: "#cs",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/cremedigital.png",
    },
    {
      title: "Design",
      link: "#design",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/goldenbellsacademy.png",
    },
    {
      title: "Technology",
      link: "#tech",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/invoker.png",
    },
    {
      title: "Innovation",
      link: "#innovation",
      thumbnail: "https://aceternity.com/images/products/thumbnails/new/efreeinvoice.png",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <NavbarButton variant="primary">Get Started</NavbarButton>
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
    </div>
  );
}
