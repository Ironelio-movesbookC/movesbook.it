'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Heart, ChevronDown, ChevronUp, Calendar, ExternalLink, Facebook, Twitter, Linkedin, Rss } from 'lucide-react';

interface PopularPost {
  id: string;
  title: string | null;
  date?: string;
  createdAt?: string;
  image?: string | null;
}

interface GetSocialBlockProps {
  popularPosts?: PopularPost[];
}

export default function GetSocialBlock({ popularPosts = [] }: GetSocialBlockProps) {
  const [isSocialExpanded, setIsSocialExpanded] = useState(true);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const postsToShow = popularPosts.length > 0 
    ? popularPosts.slice(0, 4).map(post => ({
        id: post.id,
        title: post.title || 'Untitled',
        date: formatDate(post.date || post.createdAt),
        image: post.image || '/img/post_img1.jpg',
      }))
    : [];

  const toggleSocial = () => {
    setIsSocialExpanded(!isSocialExpanded);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Get Social</h3>
          </div>
          <button
            onClick={toggleSocial}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSocialExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        
        {isSocialExpanded && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#3b5998] hover:bg-[#2d4373] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#00aced] hover:bg-[#0084b4] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#23659f] hover:bg-[#1a4a7a] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#d94c3b] hover:bg-[#b83a2b] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="Google Plus"
              >
                <span className="text-white text-lg font-bold">G+</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#e94e5c] hover:bg-[#c93d4a] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="Pinterest"
              >
                <span className="text-white text-lg font-bold">P</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center bg-[#ff6600] hover:bg-[#cc5200] rounded-lg transition-colors"
                onClick={(e) => e.preventDefault()}
                aria-label="RSS"
              >
                <Rss className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Popular Posts</h3>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          {postsToShow.length > 0 ? postsToShow.map((post) => (
            <Link 
              key={post.id}
              href={`/news/${post.id}`}
              className="flex gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors group"
            >
              <div className="flex-shrink-0">
                <Image
                  src={post.image || '/img/post_img1.jpg'}
                  alt={post.title}
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">{post.date}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <div className="mt-1 sm:mt-2 flex items-center gap-1 text-xs text-blue-600 group-hover:text-blue-700">
                  <span>Read more</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </Link>
          )) : (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3 p-3">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
