"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { 
  UserIcon, 
  WrenchScrewdriverIcon,
  ClockIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

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
    <div className="min-h-screen bg-main-bg text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        {/* Under Development Section */}
        <div className="bg-sidebar-bg rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            {/* Icon */}
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-accent to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <WrenchScrewdriverIcon className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-4 text-white">
              Profile Page Under Development
            </h2>

            {/* Description */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              We're working hard to bring you a comprehensive profile management system. 
              Soon you'll be able to update your information, change passwords, and manage your preferences.
            </p>

            {/* Features Coming Soon */}
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center justify-center gap-2">
                <SparklesIcon className="w-5 h-5 text-accent" />
                Coming Soon
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Profile picture upload</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Personal information editing</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Password change functionality</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Account preferences</span>
                </div>
              </div>
            </div>

            {/* Current User Info */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{session.user.name || "User"}</p>
                  <p className="text-gray-400 text-sm">{session.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon className="w-4 h-4" />
                <span>Account created recently</span>
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-8">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors font-medium"
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span>Development in progress</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
