"use client";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useState } from "react";
import clsx from "clsx";

function RootLayoutClientInner({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  
  return (
    <div className="min-h-screen flex relative overflow-x-hidden">
      {/* Sidebar: overlays on mobile, pushes content on desktop */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(false)} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-main-bg/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
      {/* Main area: responsive margin and width */}
      <div className={clsx(
        'flex-1 flex flex-col min-h-screen transition-all bg-main-bg',
        // Mobile: full width, no margin
        'w-full',
        // Tablet: full width, no margin
        'md:w-full',
        // Desktop: margin when sidebar open
        sidebarOpen ? 'lg:ml-64 lg:w-[calc(100vw-16rem)]' : 'lg:ml-0 lg:w-full',
        'relative' // Removed pt-16 to prevent vertical scrolling
      )}>
        {/* NavBar at the top of main content */}
        <NavBar showSidebarToggle={!sidebarOpen} onSidebarToggle={() => setSidebarOpen(true)} />
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <RootLayoutClientInner>{children}</RootLayoutClientInner>
    </SidebarProvider>
  );
}