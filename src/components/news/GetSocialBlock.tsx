'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Heart, ChevronDown, ChevronUp,
  Calendar, Facebook, Twitter, Linkedin, Rss,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PopularPost {
  id: string;
  title: string;
  date?: string;
  createdAt?: string;
  image?: string | null;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 10; y--) years.push(y);
  return years;
}

const YEAR_OPTIONS = buildYearOptions();

export default function GetSocialBlock() {
  const { t } = useLanguage();
  const [isSocialExpanded, setIsSocialExpanded] = useState(true);
  const [posts, setPosts]                       = useState<PopularPost[]>([]);
  const [loading, setLoading]                   = useState(true);

  // Date filter — empty string means "all"
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear,  setSelectedYear]  = useState<string>('');

  const fetchPosts = useCallback(async (month?: number, year?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '15' });
      if (month) params.set('month', String(month));
      if (year)  params.set('year',  String(year));

      const res = await fetch(`/api/public/news/popular?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.popularPosts ?? []);
      }
    } catch (err) {
      console.error('Error fetching popular posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    if(selectedYear) {
      fetchPosts(value ? Number(value) : undefined, selectedYear ? Number(selectedYear) : undefined);
    }
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    if(selectedMonth) {
      fetchPosts(selectedMonth ? Number(selectedMonth) : undefined, value ? Number(value) : undefined);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('news_no_date');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
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
            onClick={() => setIsSocialExpanded((v) => !v)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSocialExpanded
              ? <ChevronUp   className="w-5 h-5 text-gray-600" />
              : <ChevronDown className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {isSocialExpanded && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.open('https://facebook.com', '_blank')}
              className="w-10 h-10 flex items-center justify-center bg-[#3b5998] hover:bg-[#2d4373] rounded-lg transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              onClick={() => window.open('https://twitter.com', '_blank')}
              className="w-10 h-10 flex items-center justify-center bg-[#00aced] hover:bg-[#0084b4] rounded-lg transition-colors"
              aria-label="X / Twitter"
            >
              <Twitter className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              onClick={() => window.open('https://linkedin.com', '_blank')}
              className="w-10 h-10 flex items-center justify-center bg-[#23659f] hover:bg-[#1a4a7a] rounded-lg transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center bg-[#ff6600] hover:bg-[#cc5200] rounded-lg transition-colors"
              aria-label="RSS"
            >
              <Rss className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Popular Posts</h3>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-nowrap justify-center">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All months</option>
            {MONTH_LABELS.map((label, i) => (
              <option key={i + 1} value={String(i + 1)}>{label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto max-h-[560px] pr-1 space-y-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))
          ) : posts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No posts found.</p>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/news-by-movesbook/${post.id}`}
                className="flex gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <div className="flex-shrink-0">
                  <Image
                    src={post.image || '/img/post_img1.jpg'}
                    alt={post.title}
                    width={64}
                    height={64}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/img/post_img1.jpg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{formatDate(post.date || post.createdAt)}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <span className="mt-1 inline-block text-xs text-blue-600 group-hover:text-blue-700 group-hover:underline">
                    {t('news_read_more_text')} →
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
