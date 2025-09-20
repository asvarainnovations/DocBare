"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { 
  Cog6ToothIcon, 
  WrenchScrewdriverIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    }
  }, [session, status, router]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-main-bg text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        {/* Under Development Section */}
        <div className="bg-sidebar-bg rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            {/* Icon */}
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-accent to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cog6ToothIcon className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-4 text-white">
              Settings Page Under Development
            </h2>

            {/* Description */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              We're building a comprehensive settings management system. 
              Soon you'll have full control over your account preferences, privacy, and security settings.
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
                  <span className="text-gray-300">Privacy & Security settings</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Account management</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Data export functionality</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Notification preferences</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Theme customization</span>
                </div>
              </div>
            </div>

            {/* Current Account Info */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{session.user.name || "User"}</p>
                  <p className="text-gray-400 text-sm">{session.user.email}</p>
                  <p className="text-gray-500 text-xs">
                    {session.user.image ? "Google Account" : "Credentials Account"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Account secure and active</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button
                onClick={() => router.push("/profile")}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
              >
                <UserGroupIcon className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-white font-medium">Profile Settings</p>
                  <p className="text-gray-400 text-sm">Manage your profile information</p>
                </div>
              </button>
              
        <button
                onClick={() => router.push("/")}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
              >
                <ArrowLeftIcon className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-white font-medium">Back to Chat</p>
                  <p className="text-gray-400 text-sm">Return to your conversations</p>
                </div>
        </button>
            </div>

            {/* Development Status */}
            <div className="bg-gradient-to-r from-accent/20 to-purple-600/20 rounded-lg p-4 border border-accent/30">
              <div className="flex items-center justify-center gap-2 text-sm text-accent">
                <WrenchScrewdriverIcon className="w-4 h-4 animate-pulse" />
                <span>Development in progress</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Our team is working hard to bring you the best settings experience
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span>Settings system coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
