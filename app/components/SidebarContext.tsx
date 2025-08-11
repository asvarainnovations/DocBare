"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('docbare_sidebar_open');
      if (savedState !== null) {
        setSidebarOpen(savedState === 'true');
      }
      setIsInitialized(true);
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  const handleSetSidebarOpen = (open: boolean) => {
    setSidebarOpen(open);
    if (typeof window !== 'undefined') {
      localStorage.setItem('docbare_sidebar_open', open.toString());
    }
  };

  return (
    <SidebarContext.Provider value={{ 
      sidebarOpen: isInitialized ? sidebarOpen : false, 
      setSidebarOpen: handleSetSidebarOpen 
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
} 