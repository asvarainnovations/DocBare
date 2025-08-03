"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
  session: any;
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
        theme="dark"
      />
    </SessionProvider>
  );
} 