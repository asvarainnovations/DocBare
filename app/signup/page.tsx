"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import AuthGuard from "../components/AuthGuard";
import { Checkbox } from "../components/ui/checkbox";

function SignupPageInner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!agreedToTerms) {
      toast.error("You must agree to the Privacy Policy and Terms & Conditions to continue.");
      setLoading(false);
      return;
    }
    
    try {
      if (password) {
        // Credentials signup
        const res = await axios.post("/api/auth/register", { email, password });
        if (res.status !== 201) {
          toast.error(res.data.error || "Failed to sign up.");
        } else {
          // Auto-login after signup
          const loginRes = await signIn("credentials", { email, password, redirect: false });
          if (loginRes?.error) toast.error("Signup succeeded but login failed.");
          else window.location.href = "/";
        }
      } else {
        // Email magic link
        await signIn("email", { email, callbackUrl: "/" });
      }
    } catch (err) {
      toast.error("Failed to sign up. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md mx-auto p-8 rounded-lg shadow-lg bg-card border border-border">
        <h1 className="text-3xl font-bold mb-8 text-center text-foreground">Create an account</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email address"
            className="w-full px-4 py-3 border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-ring text-lg text-foreground placeholder-muted-foreground"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-3 border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-ring text-lg text-foreground placeholder-muted-foreground"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          
          <div className="flex items-center space-x-3 py-2">
            <Checkbox
              id="agree-terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <label 
              htmlFor="agree-terms" 
              className="text-xs text-foreground leading-tight cursor-pointer flex-1"
            >
              I agree to the{" "}
              <Link 
                href="https://www.asvarainnovation.com/policies/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link 
                href="https://www.asvarainnovation.com/policies/tos" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Terms & Conditions
              </Link>
            </label>
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3 rounded text-lg font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Continue"}
          </button>
        </form>
        <div className="text-center mt-4 text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </div>
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="mx-4 text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border border-input py-3 rounded text-lg font-medium bg-background text-foreground hover:bg-accent transition"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.69 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.19C12.13 14.13 17.57 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.09 46.1 31.27 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 0 1 0-8.56l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.75l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.14-5.59l-7.19-5.59c-2.01 1.35-4.59 2.16-7.95 2.16-6.43 0-11.87-4.63-13.33-10.75l-7.98 6.19C6.73 42.18 14.82 48 24 48z"/></g></svg>
          Continue with Google
        </button>
        <div className="text-center text-xs text-muted-foreground mt-8">
          <Link href="https://www.asvarainnovation.com/policies/tos" className="hover:underline">Terms of Use</Link> &nbsp;|&nbsp; <Link href="https://www.asvarainnovation.com/policies/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthGuard requireAuth={false}>
      <SignupPageInner />
    </AuthGuard>
  );
} 