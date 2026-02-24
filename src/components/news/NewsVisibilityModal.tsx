'use client';

import { useState, useEffect } from 'react';
import { X, Users, UserCheck, Eye, EyeOff } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  name?: string;
  isAuthorized: boolean;
}

interface NewsVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsId: string;
  newsTitle: string;
}

export default function NewsVisibilityModal({
  isOpen,
  onClose,
  newsId,
  newsTitle,
}: NewsVisibilityModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [authorizedFriends, setAuthorizedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      fetchAuthorizedFriends();
    }
  }, [isOpen, newsId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const res = await fetch('/api/user/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends.map((f: any) => ({ ...f, isAuthorized: false })));
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthorizedFriends = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const res = await fetch(`/api/news/${newsId}/authorized-friends`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAuthorizedFriends(new Set(data.friendIds || []));
      }
    } catch (error) {
      console.error('Error fetching authorized friends:', error);
    }
  };

  const toggleFriendAuthorization = (friendId: string) => {
    const newAuthorized = new Set(authorizedFriends);
    if (newAuthorized.has(friendId)) {
      newAuthorized.delete(friendId);
    } else {
      newAuthorized.add(friendId);
    }
    setAuthorizedFriends(newAuthorized);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const res = await fetch(`/api/news/${newsId}/authorized-friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          friendIds: Array.from(authorizedFriends),
        }),
      });

      if (res.ok) {
        alert('Visibility settings saved successfully!');
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save visibility settings');
      }
    } catch (error) {
      console.error('Error saving visibility settings:', error);
      alert('An error occurred while saving visibility settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 relative max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Manage Visibility</h3>
                <p className="text-sm text-gray-600 mt-1">{newsTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Control who can see this article</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Select specific friends who are authorized to view this article on your Movesbook page.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading friends...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No friends available</p>
                <p className="text-sm text-gray-500 mt-1">Add friends to manage visibility settings</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {friends.map((friend) => {
                  const isAuthorized = authorizedFriends.has(friend.id);
                  return (
                    <label
                      key={friend.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isAuthorized}
                        onChange={() => toggleFriendAuthorization(friend.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {friend.username || friend.name}
                        </p>
                      </div>
                      {isAuthorized && (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {authorizedFriends.size > 0
                  ? `${authorizedFriends.size} friend(s) authorized`
                  : 'No friends authorized (article will be private)'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
