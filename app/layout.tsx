import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import RootLayoutClient from "./components/RootLayoutClient";
import ErrorBoundary from "./components/ErrorBoundary";
import Providers from "./components/Providers";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
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
