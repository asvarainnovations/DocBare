"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import axios from "axios";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null);
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    } else {
      // Check if Google is linked
      axios.get("/api/account/providers").then(res => {
        setGoogleLinked(res.data.providers.includes("google"));
      }).catch(() => setGoogleLinked(null));
    }
  }, [session, status, router]);
  if (status !== "authenticated") return null;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <p className="mb-2">Manage your account settings here.</p>
      {googleLinked === false && (
        <button
          className="mt-4 px-6 py-2 bg-accent rounded text-white font-semibold hover:bg-blue-700 transition"
          onClick={() => signIn("google", { callbackUrl: "/settings" })}
        >
          Link Google Account
        </button>
      )}
      {googleLinked === true && (
        <div className="mt-4 text-green-400 font-semibold">Google account linked!</div>
      )}
      {googleLinked === null && (
        <div className="mt-4 text-gray-400">Checking Google account status…</div>
      )}
    </div>
  );
} 