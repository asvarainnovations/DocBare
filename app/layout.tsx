import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "./components/SessionProvider";
import RootLayoutClient from "./components/RootLayoutClient";
import ErrorBoundary from "./components/ErrorBoundary";

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
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-background text-white`}
      >
        <NextAuthSessionProvider>
          <ErrorBoundary>
            <RootLayoutClient>
              {children}
            </RootLayoutClient>
          </ErrorBoundary>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
