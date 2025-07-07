"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn("email", { email, callbackUrl: "/" });
    } catch (err) {
      setError("Failed to send signup link. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create an account</h1>
        <form onSubmit={handleEmailSignup} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email address"
            className="w-full px-4 py-3 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded text-lg font-semibold hover:bg-gray-900 transition"
            disabled={loading}
          >
            {loading ? "Loading..." : "Continue"}
          </button>
        </form>
        {error && <div className="text-red-500 text-center mt-2">{error}</div>}
        <div className="text-center mt-4 text-gray-700">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="mx-4 text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 py-3 rounded text-lg font-medium bg-white text-black hover:bg-gray-100 transition"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.69 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.19C12.13 14.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.09 46.1 31.27 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 0 1 0-8.56l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.75l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.14-5.59l-7.19-5.59c-2.01 1.35-4.59 2.16-7.95 2.16-6.43 0-11.87-4.63-13.33-10.75l-7.98 6.19C6.73 42.18 14.82 48 24 48z"/></g></svg>
          Continue with Google
        </button>
        <div className="text-center text-xs text-gray-400 mt-8">
          <Link href="/terms" className="hover:underline">Terms of Use</Link> &nbsp;|&nbsp; <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
} 