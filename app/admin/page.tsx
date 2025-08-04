'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChatBubbleLeftRightIcon, 
  HandThumbUpIcon, 
  HandThumbDownIcon,
  UsersIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface DashboardStats {
  totalFeedbacks: number;
  goodPercentage: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFeedbacks: 0,
    goodPercentage: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/admin/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Feedbacks */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Feedbacks</p>
              <p className="text-3xl font-bold text-white">{stats.totalFeedbacks.toLocaleString()}</p>
            </div>
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Good vs Bad Percentage */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">% Good vs. Bad</p>
              <p className="text-3xl font-bold text-white">{stats.goodPercentage}% Good</p>
            </div>
            <div className="flex space-x-1">
              <HandThumbUpIcon className="w-8 h-8 text-green-500" />
              <HandThumbDownIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Users Who Gave Feedback</p>
              <p className="text-3xl font-bold text-white">{stats.activeUsers.toLocaleString()}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">View All Feedback</h2>
            <p className="text-gray-400">Explore detailed feedback from all users and manage responses.</p>
          </div>
          <Link
            href="/admin/feedbacks"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            View All Feedback
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
} 