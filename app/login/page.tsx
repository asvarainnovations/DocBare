"use client";
import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const params = useSearchParams();
  const urlError = params.get("error");
  const type = params.get("type");

  let providerErrorMsg = "";
  if (urlError === "provider-mismatch") {
    if (type === "google") {
      providerErrorMsg = "You are already registered with Google. Please use Google login.";
    } else if (type === "credentials") {
      providerErrorMsg = "You are already registered with email/password. Please use that method to log in.";
    } else {
      providerErrorMsg = "You are already registered with a different login method. Please use the correct method.";
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (password) {
        // Credentials login
        const res = await signIn("credentials", { email, password, redirect: false });
        if (res?.error) setError("Invalid email or password.");
        else window.location.href = "/";
      } else {
        // Email magic link
        await signIn("email", { email, callbackUrl: "/" });
      }
    } catch (err) {
      setError("Failed to login. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md mx-auto p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">Welcome back</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email address"
            className="w-full px-4 py-3 border border-slate bg-background rounded focus:outline-none focus:ring-2 focus:ring-accent text-lg text-white placeholder-gray-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (for credentials login)"
              className="w-full px-4 py-3 border border-slate bg-background rounded focus:outline-none focus:ring-2 focus:ring-accent text-lg text-white placeholder-gray-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-accent text-white py-3 rounded text-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Continue"}
          </button>
        </form>
        {error && <div className="text-red-400 text-center mt-2">{error}</div>}
        {providerErrorMsg && <div className="text-red-400 text-center mt-2">{providerErrorMsg}</div>}
        <div className="text-center mt-4 text-gray-400">
          Don't have an account? <Link href="/signup" className="text-accent hover:underline">Sign up</Link>
        </div>
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="mx-4 text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border border-gray-700 py-3 rounded text-lg font-medium bg-background text-white hover:bg-slate transition"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.69 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.19C12.13 14.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.09 46.1 31.27 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 0 1 0-8.56l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.75l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.14-5.59l-7.19-5.59c-2.01 1.35-4.59 2.16-7.95 2.16-6.43 0-11.87-4.63-13.33-10.75l-7.98 6.19C6.73 42.18 14.82 48 24 48z"/></g></svg>
          Continue with Google
        </button>
        <div className="text-center text-xs text-gray-600 mt-8">
          <Link href="https://www.asvarainnovation.com/policies/tos" className="hover:underline">Terms of Use</Link> &nbsp;|&nbsp; <Link href="https://www.asvarainnovation.com/policies/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
} 