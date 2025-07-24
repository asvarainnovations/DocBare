import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "./components/SessionProvider";
import Sidebar from "./components/Sidebar";
import { useState } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DocBare",
  description: "Legal AI Document Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-background text-white`}>
        <NextAuthSessionProvider>
          <div className="min-h-screen flex relative" style={{ width: '100vw' }}>
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
            <div className={"flex-1 flex flex-col min-h-screen transition-all" + (sidebarOpen ? " md:ml-60" : " md:ml-0")}> 
              {children}
            </div>
          </div>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
