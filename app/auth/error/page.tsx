"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function AuthErrorPageInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") || "/";
  const provider = params.get("provider") || (callbackUrl.includes("google") ? "google" : "credentials");

  useEffect(() => {
    // Only redirect for actual provider conflicts, not for new user signups
    if (error === "OAuthAccountNotLinked" && provider !== "google") {
      router.replace(`/login?error=provider-mismatch&type=${provider}`);
    }
  }, [error, provider, router]);

  if (error === "OAuthAccountNotLinked" && provider === "google") {
    // Show signup completion page for Google users
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="p-8 rounded shadow bg-gray-900">
          <h1 className="text-2xl font-bold mb-4">Complete Your Signup</h1>
          <p className="mb-4 text-green-400">Google authentication successful!</p>
          <p className="mb-4">Please complete your account setup by clicking the button below.</p>
          <button
            onClick={() => router.push('/signup')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Complete Signup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="p-8 rounded shadow bg-gray-900">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        {error === 'OAuthAccountNotLinked' ? (
          <>
            <p className="mb-2 text-red-400 font-semibold">This email is already registered with a different login method.</p>
            <p className="mb-2">Please log in with your password, then link your Google account from <a href="/settings" className="text-accent underline">Settings</a>.</p>
            <a href="/login" className="text-accent underline mt-4 block">Back to Login</a>
          </>
        ) : (
          <>
            <p className="mb-2">Something went wrong during authentication.</p>
            {error && <p className="text-red-400">Error: {error}</p>}
            <a href="/login" className="text-accent underline mt-4 block">Back to Login</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorPageInner />
    </Suspense>
  );
} 