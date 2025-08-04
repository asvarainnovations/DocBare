'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeftIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  image?: string;
  totalChats: number;
  goodCount: number;
  badCount: number;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  goodCount: number;
  badCount: number;
}

export default function UserFeedbackDetail() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userResponse, chatsResponse] = await Promise.all([
          axios.get(`/api/admin/feedbacks/users/${userId}`),
          axios.get(`/api/admin/feedbacks/users/${userId}/chats`)
        ]);
        
        setUser(userResponse.data.user);
        setChatSessions(chatsResponse.data.chats);
        
        // Select first chat by default
        if (chatsResponse.data.chats.length > 0) {
          setSelectedChatId(chatsResponse.data.chats[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="h-20 bg-gray-700 rounded-full w-20 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-white">Feedback Manager</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info & Chats List */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.fullName}
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-medium text-white">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">{user.fullName}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Feedback Statistics */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Feedback Statistics</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Chats</span>
                <span className="text-white font-semibold">{user.totalChats}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Good</span>
                <div className="flex items-center">
                  <HandThumbUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-white font-semibold">{user.goodCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Bad</span>
                <div className="flex items-center">
                  <HandThumbDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-white font-semibold">{user.badCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chats List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Chats List</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${
                    selectedChatId === chat.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white truncate">{chat.title}</h4>
                    <div className="flex space-x-2">
                      {chat.goodCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🟢 Good × {chat.goodCount}
                        </span>
                      )}
                      {chat.badCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          🔴 Bad × {chat.badCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Chat Detail */}
        <div className="lg:col-span-2">
          {selectedChatId ? (
            <ChatFeedbackDetail chatId={selectedChatId} />
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select a chat to view feedback details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Chat Feedback Detail Component
function ChatFeedbackDetail({ chatId }: { chatId: string }) {
  const [chatDetail, setChatDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatDetail = async () => {
      try {
        const response = await axios.get(`/api/admin/feedbacks/chats/${chatId}`);
        setChatDetail(response.data);
      } catch (error) {
        console.error('Failed to fetch chat detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatDetail();
  }, [chatId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!chatDetail) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">Chat not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Chat Header */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-2">{chatDetail.title}</h2>
        <p className="text-gray-400">{new Date(chatDetail.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Chat Transcript */}
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {chatDetail.messages?.map((message: any, index: number) => (
          <div key={index} className="space-y-2">
            <div className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gray-700 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
            
            {/* Feedback Badge */}
            {message.feedback && (
              <div className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className="flex items-center space-x-2">
                  {message.feedback.rating === 'good' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      👍 Good Response
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔻 Bad Response
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Comments */}
            {message.feedback?.comments && (
              <div className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-xs lg:max-w-md bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-300">{message.feedback.comments}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Mark Resolved
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
            Reply / Note
          </button>
        </div>
      </div>
    </div>
  );
} 