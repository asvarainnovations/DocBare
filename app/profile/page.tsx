"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.image) {
      // Redirect Google users or unauthenticated users
      router.replace("/");
    }
  }, [session, status, router]);
  if (status !== "authenticated" || session?.user?.image) return null;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-3xl font-bold mb-4">Profile</h1>
      <p className="mb-2">Welcome, {session.user.email}!</p>
      <p>This is your profile page. (Credentials login only)</p>
    </div>
  );
} 