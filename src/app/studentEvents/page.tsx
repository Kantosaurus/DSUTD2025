"use client";

import { useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
} from "@/components/ui/resizable-navbar";
import { AvatarDropdown } from "@/components/ui/avatar-dropdown";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { name: "Home", link: "/home" },
    { name: "My Events", link: "/events" },
    { name: "Settings", link: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Navbar>
        <NavbarLogo />
        <NavBody>
          <NavItems items={navItems} />
        </NavBody>
        <AvatarDropdown />
      </Navbar>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-full max-w-xl flex items-center relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] text-lg"
          />
        </div>
      </div>
    </div>
  );
}
