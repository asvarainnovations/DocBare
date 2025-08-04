'use client';

import { useState } from 'react';
import { Cog6ToothIcon, ShieldCheckIcon, UserGroupIcon, BellIcon } from '@heroicons/react/24/outline';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'users', name: 'Users', icon: UserGroupIcon },
    { id: 'admins', name: 'Admins', icon: UserGroupIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Asvara Company"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@asvara.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Security Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Enable
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Session Timeout</h3>
                    <p className="text-sm text-gray-400">Automatically log out after inactivity</p>
                  </div>
                  <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">User Management</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">User Registration</h3>
                    <p className="text-sm text-gray-400">Allow new users to register</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                    Enabled
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Email Verification</h3>
                    <p className="text-sm text-gray-400">Require email verification for new accounts</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                    Enabled
                  </button>
                </div>
              </div>
            </div>
          )}

                     {activeTab === 'admins' && (
             <div className="space-y-6">
               <h2 className="text-xl font-semibold text-white">Admin Management</h2>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-medium text-white">Invite New Admin</h3>
                     <p className="text-sm text-gray-400">Send invitation to new admin user</p>
                   </div>
                   <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                     Invite Admin
                   </button>
                 </div>
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-medium text-white">View All Admins</h3>
                     <p className="text-sm text-gray-400">Manage existing admin accounts</p>
                   </div>
                   <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                     View Admins
                   </button>
                 </div>
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-medium text-white">Pending Invites</h3>
                     <p className="text-sm text-gray-400">View and manage pending invitations</p>
                   </div>
                   <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                     View Invites
                   </button>
                 </div>
               </div>
             </div>
           )}

           {activeTab === 'notifications' && (
             <div className="space-y-6">
               <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-medium text-white">Email Notifications</h3>
                     <p className="text-sm text-gray-400">Receive notifications via email</p>
                   </div>
                   <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                     Enable
                   </button>
                 </div>
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-medium text-white">Feedback Alerts</h3>
                     <p className="text-sm text-gray-400">Get notified when users submit feedback</p>
                   </div>
                   <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                     Enabled
                   </button>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
} 