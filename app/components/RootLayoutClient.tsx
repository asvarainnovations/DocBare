"use client";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import { useState } from "react";
import clsx from "clsx";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  return (
    <div className="min-h-screen flex relative" style={{ width: '100vw' }}>
      {/* Sidebar: overlays on mobile, pushes content on desktop */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(false)} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
      {/* Main area: margin left and width on desktop when sidebar is open, no top padding */}
      <div className={clsx(
        'flex-1 flex flex-col min-h-screen transition-all',
        sidebarOpen ? 'md:ml-60 md:w-[calc(100vw-15rem)]' : 'md:ml-0 md:w-full',
        'relative'
      )}>
        {/* Absolutely positioned NavBar at the top of main content, overlapping content */}
        <div className="absolute top-0 left-0 w-full z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <NavBar showSidebarToggle={!sidebarOpen} onSidebarToggle={() => setSidebarOpen(true)} />
          </div>
        </div>
        {/* Main content with no top padding, so content can go under NavBar */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}