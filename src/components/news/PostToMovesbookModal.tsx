'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Users, UserCheck } from 'lucide-react';
import Image from 'next/image';

interface Friend {
  id: string;
  username: string;
  profileImage?: string | null;
}

interface PostToMovesbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  articleImage?: string | null;
}

export default function PostToMovesbookModal({
  isOpen,
  onClose,
  articleId,
  articleTitle,
  articleImage,
}: PostToMovesbookModalProps) {
  const [shareOptionId, setShareOptionId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);
  const [isReshareDisabled, setIsReshareDisabled] = useState(true);
  const [isCommentsEnabled, setIsCommentsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShareOptionId(null);
      setSelectedFriends(new Set());
      setShowFriendDropdown(false);
      setIsReshareDisabled(true);
      setIsCommentsEnabled(true);
    } else {
      fetchFriends();
    }
  }, [isOpen]);

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
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const res = await fetch('/api/user/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      } else {
        console.error('Failed to fetch friends:', res.statusText);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareOption = (optionId: number) => {
    setShareOptionId(optionId);
    if (optionId !== 3) {
      setSelectedFriends(new Set());
      setShowFriendDropdown(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleShare = async () => {
    if (!shareOptionId) {
      alert('Please select a sharing option');
      return;
    }

    if (shareOptionId === 3 && selectedFriends.size === 0) {
      alert('Please select at least one friend to share with.');
      return;
    }

    try {
      setSharing(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        alert('Please log in to share posts');
        return;
      }

      const res = await fetch('/api/news/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          article_id: articleId,
          share_option_id: shareOptionId,
          selected_friends_id: Array.from(selectedFriends).join(','),
          is_reshare_disabled: isReshareDisabled ? 1 : 0,
          is_comments_enabled: isCommentsEnabled ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Post shared successfully!');
        onClose();
      } else {
        alert(data.message || 'Failed to share post');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('An error occurred while sharing the post.');
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  const selectedFriendNames = Array.from(selectedFriends)
    .map(id => friends.find(f => f.id === id)?.username)
    .filter(Boolean);

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
              <h3 className="text-xl font-bold text-gray-900">Create Post</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  disabled={sharing || !shareOptionId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {sharing ? 'Sharing...' : 'Share'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                {articleImage ? (
                  <Image
                    src={articleImage}
                    alt={articleTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{articleTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Public</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleShareOption(1)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  shareOptionId === 1
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className={`w-5 h-5 ${shareOptionId === 1 ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div>
                    <p className="font-medium text-gray-900">Post on my page for my visitors</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleShareOption(2)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  shareOptionId === 2
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-5 h-5 ${shareOptionId === 2 ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div>
                    <p className="font-medium text-gray-900">Post on the page News posted</p>
                    <p className="text-xs text-gray-500 mt-1">
                      (shows only the posts related to the friends of the user logged in)
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleShareOption(3)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  shareOptionId === 3
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className={`w-5 h-5 ${shareOptionId === 3 ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Post on the page of specific friends</p>
                    {shareOptionId === 3 && (
                      <div className="mt-3 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFriendDropdown(!showFriendDropdown);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm bg-white hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-gray-600">
                            {selectedFriends.size > 0
                              ? `${selectedFriends.size} friend(s) selected`
                              : 'Select friends...'}
                          </span>
                          <span className="text-gray-400">▼</span>
                        </button>

                        {showFriendDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {loading ? (
                              <div className="p-4 text-center text-gray-500">Loading friends...</div>
                            ) : friends.length === 0 ? (
                              <div className="p-4 text-center text-gray-500">No friends available</div>
                            ) : (
                              friends.map((friend) => (
                                <label
                                  key={friend.id}
                                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFriends.has(friend.id)}
                                    onChange={() => toggleFriendSelection(friend.id)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{friend.username}</p>
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                        )}

                        {selectedFriendNames.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                            <strong>Selected:</strong> {selectedFriendNames.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {shareOptionId && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isReshareDisabled}
                    onChange={(e) => setIsReshareDisabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Disable resharing of this article by the recipient
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCommentsEnabled}
                    onChange={(e) => setIsCommentsEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable comments</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
