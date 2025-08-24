import type { Metadata } from "next";
// import { Inter, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/polyfills"; // Import polyfills for server-side compatibility
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import RootLayoutClient from "./components/RootLayoutClient";
import ErrorBoundary from "./components/ErrorBoundary";
import Providers from "./components/Providers";

// const inter = Inter({ 
//   subsets: ["latin"],
//   variable: '--font-inter',
//   display: 'swap',
// });

// const sourceSans = Source_Sans_3({ 
//   subsets: ["latin"],
//   variable: '--font-source-sans',
//   display: 'swap',
// });

// const jetbrainsMono = JetBrains_Mono({ 
//   subsets: ["latin"],
//   variable: '--font-jetbrains-mono',
//   display: 'swap',
// });

export const metadata: Metadata = {
  title: "DocBare - Legal AI Platform",
  description: "Modern legal AI platform for document drafting and analysis",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="font-legal">
        <ErrorBoundary>
          <Providers session={session}>
            <RootLayoutClient>
              {children}
            </RootLayoutClient>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
