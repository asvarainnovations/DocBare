"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean; // true = require authenticated, false = require unauthenticated
}

export default function AuthGuard({ 
  children, 
  redirectTo = "/", 
  requireAuth = false 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (requireAuth && !session) {
      // Require auth but user is not authenticated - redirect to login
      router.push("/login");
    } else if (!requireAuth && session) {
      // Require unauthenticated but user is authenticated - redirect to home
      router.push(redirectTo);
    }
  }, [session, status, router, redirectTo, requireAuth]);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If requireAuth is true and no session, or requireAuth is false and there is a session,
  // we're redirecting, so show loading
  if ((requireAuth && !session) || (!requireAuth && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}