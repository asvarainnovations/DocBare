"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { 
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  GlobeAltIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

interface PrivacySettings {
  dataRetention: '30days' | '90days' | '1year' | 'forever';
  sessionTimeout: '1hour' | '8hours' | '24hours' | '7days';
  allowAnalytics: boolean;
  allowMarketingEmails: boolean;
  allowChatHistory: boolean;
  allowDocumentStorage: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataRetention: '90days',
    sessionTimeout: '24hours',
    allowAnalytics: true,
    allowMarketingEmails: false,
    allowChatHistory: true,
    allowDocumentStorage: true
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    } else {
      // Check if Google is linked
      axios.get("/api/account/providers").then(res => {
        setGoogleLinked(res.data.providers.includes("google"));
      }).catch(() => setGoogleLinked(null));

      // Load privacy settings
      loadPrivacySettings();
    }
  }, [session, status, router]);

  const loadPrivacySettings = async () => {
    try {
      const response = await axios.get("/api/user/privacy-settings");
      if (response.data.success) {
        setPrivacySettings(response.data.settings);
      }
    } catch (error) {
      console.error("Failed to load privacy settings:", error);
    }
  };

  const handlePrivacySettingsUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await axios.patch("/api/user/privacy-settings", privacySettings);
      if (response.data.success) {
        toast.success("Privacy settings updated successfully!");
      }
    } catch (error: any) {
      console.error("Privacy settings update error:", error);
      toast.error(error.response?.data?.error || "Failed to update privacy settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataExport = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/user/export-data", {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `docbare-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully!");
    } catch (error: any) {
      console.error("Data export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete("/api/user/account");
      if (response.data.success) {
        toast.success("Account deleted successfully");
        router.push("/");
      }
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast.error(error.response?.data?.error || "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-main-bg text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Management */}
          <div className="space-y-6">
            <div className="bg-sidebar-bg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" />
                Account Management
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Email</p>
                  <p className="text-white">{session.user.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Account Type</p>
                  <p className="text-white">
                    {session.user.image ? "Google Account" : "Credentials Account"}
                  </p>
                </div>

                {!session.user.image && googleLinked === false && (
                  <button
                    className="w-full px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                    onClick={() => signIn("google", { callbackUrl: "/settings" })}
                  >
                    Link Google Account
                  </button>
                )}

                {googleLinked === true && (
                  <div className="text-green-400 text-sm flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4" />
                    Google account linked
                  </div>
                )}
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-sidebar-bg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5" />
                Data Management
              </h2>
              
              <div className="space-y-4">
                <button
                  onClick={handleDataExport}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  {isLoading ? "Exporting..." : "Export My Data"}
                </button>

                <button
                  onClick={handleAccountDeletion}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  {isLoading ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-6">
            <div className="bg-sidebar-bg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5" />
                Privacy & Security
              </h2>
              
              <div className="space-y-6">
                {/* Data Retention */}
                <div>
                  <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                  <select
                    value={privacySettings.dataRetention}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      dataRetention: e.target.value as PrivacySettings['dataRetention']
                    })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="30days">30 days</option>
                    <option value="90days">90 days</option>
                    <option value="1year">1 year</option>
                    <option value="forever">Forever</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How long to keep your data after account deletion
                  </p>
                </div>

                {/* Session Timeout */}
                <div>
                  <label className="block text-sm font-medium mb-2">Session Timeout</label>
                  <select
                    value={privacySettings.sessionTimeout}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      sessionTimeout: e.target.value as PrivacySettings['sessionTimeout']
                    })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="1hour">1 hour</option>
                    <option value="8hours">8 hours</option>
                    <option value="24hours">24 hours</option>
                    <option value="7days">7 days</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How long to keep you logged in
                  </p>
                </div>

                {/* Privacy Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Allow Analytics</p>
                      <p className="text-xs text-gray-500">Help us improve by sharing usage data</p>
                    </div>
                    <button
                      onClick={() => setPrivacySettings({
                        ...privacySettings,
                        allowAnalytics: !privacySettings.allowAnalytics
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacySettings.allowAnalytics ? 'bg-accent' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacySettings.allowAnalytics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Marketing Emails</p>
                      <p className="text-xs text-gray-500">Receive updates about new features</p>
                    </div>
                    <button
                      onClick={() => setPrivacySettings({
                        ...privacySettings,
                        allowMarketingEmails: !privacySettings.allowMarketingEmails
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacySettings.allowMarketingEmails ? 'bg-accent' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacySettings.allowMarketingEmails ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Chat History</p>
                      <p className="text-xs text-gray-500">Store your conversation history</p>
                    </div>
                    <button
                      onClick={() => setPrivacySettings({
                        ...privacySettings,
                        allowChatHistory: !privacySettings.allowChatHistory
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacySettings.allowChatHistory ? 'bg-accent' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacySettings.allowChatHistory ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Document Storage</p>
                      <p className="text-xs text-gray-500">Store uploaded documents</p>
                    </div>
                    <button
                      onClick={() => setPrivacySettings({
                        ...privacySettings,
                        allowDocumentStorage: !privacySettings.allowDocumentStorage
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacySettings.allowDocumentStorage ? 'bg-accent' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacySettings.allowDocumentStorage ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handlePrivacySettingsUpdate}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Updating..." : "Save Privacy Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 