'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Comment {
  id: string;
  comment: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    image?: string | null;
    firstname?: string | null;
    surname?: string | null;
  } | null;
  replies?: Comment[];
}

interface NewsCommentsProps {
  newsId: string;
  enabled: boolean;
}

export default function NewsComments({ newsId, enabled }: NewsCommentsProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [authorType, setAuthorType] = useState<'current' | 'entity'>('current');
  const [entityUsername, setEntityUsername] = useState('');
  const [entityPassword, setEntityPassword] = useState('');
  const [entityVerified, setEntityVerified] = useState(false);
  const [verifyingEntity, setVerifyingEntity] = useState(false);
  const [entityError, setEntityError] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/news/${newsId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [newsId]);

  useEffect(() => {
    if (enabled && newsId) {
      fetchComments();
    }
  }, [newsId, enabled, fetchComments]);

  const handleVerifyEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityUsername.trim() || !entityPassword.trim()) {
      setEntityError('Please enter username and password');
      return;
    }

    setVerifyingEntity(true);
    setEntityError('');

    try {
      const res = await fetch('/api/news/verify-writer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: entityUsername,
          password: entityPassword,
        }),
      });

      const data = await res.json();

      if (data.success && data.verified) {
        setEntityVerified(true);
        setEntityError('');
      } else {
        setEntityVerified(false);
        setEntityError(data.error || 'Invalid credentials. Please check your username and password.');
      }
    } catch (error) {
      console.error('Error verifying entity:', error);
      setEntityVerified(false);
      setEntityError('An error occurred while verifying credentials');
    } finally {
      setVerifyingEntity(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (!token) {
      alert('Please log in to post a comment');
      return;
    }

    if (authorType === 'entity' && !entityVerified) {
      alert('Please verify the entity credentials before posting');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: newComment,
          authorType: authorType,
          entityUsername: authorType === 'entity' ? entityUsername : null,
          entityPassword: authorType === 'entity' ? entityPassword : null,
        }),
      });

      if (res.ok) {
        setNewComment('');
        setShowForm(false);
        setAuthorType('current');
        setEntityUsername('');
        setEntityPassword('');
        setEntityVerified(false);
        setEntityError('');
        fetchComments();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('An error occurred while posting your comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!enabled) {
    return (
      <div className="text-center py-4 text-gray-500">
        Comments are not available for this article
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 p-6 mt-6" id="comment">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Comments ({comments.length})
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add Comment
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post as
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authorType"
                  value="current"
                  checked={authorType === 'current'}
                  onChange={(e) => {
                    setAuthorType('current');
                    setEntityVerified(false);
                    setEntityError('');
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Current User</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authorType"
                  value="entity"
                  checked={authorType === 'entity'}
                  onChange={(e) => {
                    setAuthorType('entity');
                    setEntityVerified(false);
                    setEntityError('');
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Other Entity (Club, Team, etc.)</span>
              </label>
            </div>

            {authorType === 'entity' && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
                {!entityVerified ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Username
                      </label>
                      <input
                        type="text"
                        value={entityUsername}
                        onChange={(e) => {
                          setEntityUsername(e.target.value);
                          setEntityVerified(false);
                          setEntityError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter entity username"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Password
                      </label>
                      <input
                        type="password"
                        value={entityPassword}
                        onChange={(e) => {
                          setEntityPassword(e.target.value);
                          setEntityVerified(false);
                          setEntityError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter entity password"
                        required
                      />
                    </div>
                    {entityError && (
                      <div className="mb-3 text-sm text-red-600">{entityError}</div>
                    )}
                    <button
                      type="button"
                      onClick={handleVerifyEntity}
                      disabled={verifyingEntity || !entityUsername.trim() || !entityPassword.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingEntity ? 'Verifying...' : 'Verify Entity'}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Entity verified: {entityUsername}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEntityVerified(false);
                        setEntityUsername('');
                        setEntityPassword('');
                        setEntityError('');
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Comment
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-base text-gray-900 bg-white"
                placeholder="Write your comment here..."
                rows={4}
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Notify me when new comments are posted
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewComment('');
                  setAuthorType('current');
                  setEntityUsername('');
                  setEntityPassword('');
                  setEntityVerified(false);
                  setEntityError('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newComment.trim() || (authorType === 'entity' && !entityVerified)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div id="commentsSection">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No comments yet. Be the first to comment!</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add First Comment
              </button>
            )}
          </div>
        ) : (
          <div id="comment-container" className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} newsId={newsId} onReply={() => fetchComments()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentAvatar({ user, size = 'md' }: { user?: { image?: string | null; firstname?: string | null; surname?: string | null; username?: string } | null; size?: 'sm' | 'md' | 'lg' }) {
  const getInitials = () => {
    if (user?.firstname && user?.surname) {
      return `${user.firstname.charAt(0).toUpperCase()}${user.surname.charAt(0).toUpperCase()}`;
    }
    if (user?.firstname) {
      return user.firstname.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const getImageUrl = () => {
    if (user?.image) {
      if (user.image.startsWith('http') || user.image.startsWith('/')) {
        return user.image;
      }
      return `/img/profile_images/${user.image}`;
    }
    return null;
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  const sizeClass = sizeClasses[size];
  const imageUrl = getImageUrl();
  const initials = getInitials();

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={user?.username || 'User'}
        className={`${sizeClass} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold border border-gray-200`}>
      {initials}
    </div>
  );
}

function CommentItem({ comment, newsId, onReply }: { comment: Comment; newsId: string; onReply: () => void }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authorType, setAuthorType] = useState<'current' | 'entity'>('current');
  const [entityUsername, setEntityUsername] = useState('');
  const [entityPassword, setEntityPassword] = useState('');
  const [entityVerified, setEntityVerified] = useState(false);
  const [verifyingEntity, setVerifyingEntity] = useState(false);
  const [entityError, setEntityError] = useState('');

  const handleVerifyEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityUsername.trim() || !entityPassword.trim()) {
      setEntityError('Please enter username and password');
      return;
    }

    setVerifyingEntity(true);
    setEntityError('');

    try {
      const res = await fetch('/api/news/verify-writer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: entityUsername,
          password: entityPassword,
        }),
      });

      const data = await res.json();

      if (data.success && data.verified) {
        setEntityVerified(true);
        setEntityError('');
      } else {
        setEntityVerified(false);
        setEntityError(data.error || 'Invalid credentials. Please check your username and password.');
      }
    } catch (error) {
      console.error('Error verifying entity:', error);
      setEntityVerified(false);
      setEntityError('An error occurred while verifying credentials');
    } finally {
      setVerifyingEntity(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (!token) {
      alert('Please log in to post a reply');
      return;
    }

    if (authorType === 'entity' && !entityVerified) {
      alert('Please verify the entity credentials before posting');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments/${comment.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: replyText,
          authorType: authorType,
          entityUsername: authorType === 'entity' ? entityUsername : null,
          entityPassword: authorType === 'entity' ? entityPassword : null,
        }),
      });

      if (res.ok) {
        setReplyText('');
        setShowReplyForm(false);
        setAuthorType('current');
        setEntityUsername('');
        setEntityPassword('');
        setEntityVerified(false);
        setEntityError('');
        onReply();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('An error occurred while posting your reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
      id={`comment_id${comment.id}`}
    >
      <div className="flex items-start gap-3">
        <CommentAvatar user={comment.user} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900">
              {comment.user?.username || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <div className="text-gray-800 text-sm mb-3 leading-5">
            {comment.comment}
          </div>

          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            Reply
          </button>

          {showReplyForm && (
            <form onSubmit={handleReply} className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post as
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`replyAuthorType-${comment.id}`}
                      value="current"
                      checked={authorType === 'current'}
                      onChange={(e) => {
                        setAuthorType('current');
                        setEntityVerified(false);
                        setEntityError('');
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Current User</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`replyAuthorType-${comment.id}`}
                      value="entity"
                      checked={authorType === 'entity'}
                      onChange={(e) => {
                        setAuthorType('entity');
                        setEntityVerified(false);
                        setEntityError('');
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Other Entity</span>
                  </label>
                </div>

                {authorType === 'entity' && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-300">
                    {!entityVerified ? (
                      <>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Username
                          </label>
                          <input
                            type="text"
                            value={entityUsername}
                            onChange={(e) => {
                              setEntityUsername(e.target.value);
                              setEntityVerified(false);
                              setEntityError('');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                            placeholder="Enter entity username"
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Password
                          </label>
                          <input
                            type="password"
                            value={entityPassword}
                            onChange={(e) => {
                              setEntityPassword(e.target.value);
                              setEntityVerified(false);
                              setEntityError('');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                            placeholder="Enter entity password"
                            required
                          />
                        </div>
                        {entityError && (
                          <div className="mb-3 text-sm text-red-600">{entityError}</div>
                        )}
                        <button
                          type="button"
                          onClick={handleVerifyEntity}
                          disabled={verifyingEntity || !entityUsername.trim() || !entityPassword.trim()}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifyingEntity ? 'Verifying...' : 'Verify Entity'}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Entity verified: {entityUsername}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEntityVerified(false);
                            setEntityUsername('');
                            setEntityPassword('');
                            setEntityError('');
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Reply
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                    placeholder="Write your reply here..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText('');
                    setAuthorType('current');
                    setEntityUsername('');
                    setEntityPassword('');
                    setEntityVerified(false);
                    setEntityError('');
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim() || (authorType === 'entity' && !entityVerified)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              className="bg-gray-50 rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start gap-3">
                <CommentAvatar user={reply.user} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {reply.user?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <div className="text-gray-800 text-sm leading-5">
                    {reply.comment}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
