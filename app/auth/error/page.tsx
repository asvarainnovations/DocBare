"use client";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 rounded shadow bg-gray-900">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="mb-2">Something went wrong during authentication.</p>
        {error && <p className="text-red-400">Error: {error}</p>}
        <a href="/login" className="text-accent underline mt-4 block">Back to Login</a>
      </div>
    </div>
  );
} 