'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SectionGroupBar from '@/components/news/SectionGroupBar';
import NewsList from '@/components/news/NewsList';
import GetSocialBlock from '@/components/news/GetSocialBlock';
import NewsToolbox from '@/components/news/NewsToolbox';

interface Category {
  id: string;
  categoryName: string;
}

interface Sport {
  id: string;
  name: string;
}

interface Language {
  id: string;
  code: string;
  name: string;
}

interface NewsArticle {
  id: string;
  title: string;
  content?: string | Record<string, string>;
  image?: string | null;
  createdAt: string;
  mode?: string;
  internetLinkEditor?: string;
  inLastNews?: string;
  author?: string;
  originalAuthor?: string;
  searchingKeywords?: string;
  briefDesc?: string | null;
  category?: {
    id: string;
    categoryName: string;
  } | null;
  languageTitles?: Array<{
    title: string;
    language: {
      code: string;
      name: string;
    };
  }>;
  settings?: Array<{
    sports?: Array<{
      sport: string;
    }>;
  }>;
}

export default function MiniatureModePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [popularPosts, setPopularPosts] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideShowStatus, setHideShowStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('search') || '');
    setSelectedCategory(params.get('categoryId') || '');
    setSelectedSport(params.get('sportId') || '');
    setSelectedLanguage(params.get('languageId') || '');
    setPagination(prev => ({
      ...prev,
      limit: parseInt(params.get('limit') || '10'),
      page: parseInt(params.get('page') || '1'),
    }));
  }, []);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [categoriesRes, sportsRes, languagesRes] = await Promise.all([
          fetch('/api/public/news/categories'),
          fetch('/api/public/news/sports'),
          fetch('/api/public/news/languages'),
        ]);
        if (categoriesRes.ok) setCategories(await categoriesRes.json());
        if (sportsRes.ok) setSports(await sportsRes.json());
        if (languagesRes.ok) setLanguages(await languagesRes.json());
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedCategory) params.append('categoryId', selectedCategory);
        if (selectedSport) params.append('sportId', selectedSport);
        if (selectedLanguage) params.append('languageId', selectedLanguage);
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`/api/public/news?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setNews(data.news || []);
          setPagination(prev => data.pagination || prev);
          
          if (data.news && data.news.length > 0) {
            setPopularPosts(data.news.slice(0, 4));
          }
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [searchQuery, selectedCategory, selectedSport, selectedLanguage, pagination.page, pagination.limit]);

  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedSport) params.set('sportId', selectedSport);
    if (selectedLanguage) params.set('languageId', selectedLanguage);
    params.set('limit', pagination.limit.toString());
    params.set('page', pagination.page.toString());
    router.push(`/news-by-movesbook/miniature?${params.toString()}`);
  };

  const handleShow = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    updateUrlParams();
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
    updateUrlParams();
  };

  const handleModeChange = (mode: 'default' | 'list' | 'miniature' | 'section' | 'grid' | 'browser') => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedSport) params.set('sportId', selectedSport);
    if (selectedLanguage) params.set('languageId', selectedLanguage);
    params.set('limit', pagination.limit.toString());
    params.set('page', '1');
    
    if (mode === 'default') {
      router.push(`/news-by-movesbook?${params.toString()}`);
    } else if (mode === 'list') {
      router.push(`/news-by-movesbook/list?${params.toString()}`);
    } else if (mode === 'miniature') {
      router.push(`/news-by-movesbook/miniature?${params.toString()}`);
    } else if (mode === 'section') {
      router.push(`/news-by-movesbook/section?${params.toString()}`);
    } else if (mode === 'browser') {
      router.push(`/news-by-movesbook/browser?${params.toString()}`);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    updateUrlParams();
  };

  return (
    <>
      <NewsToolbox
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSport={selectedSport}
        setSelectedSport={setSelectedSport}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        onShow={handleShow}
        categories={categories}
        sports={sports}
        languages={languages}
      />

      <div className="p-6">
        <SectionGroupBar
          currentMode="miniature"
          currentLimit={pagination.limit}
          onLimitChange={handleLimitChange}
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          hideShowStatus={hideShowStatus}
          onHideShowChange={setHideShowStatus}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className={hideShowStatus ? 'lg:col-span-3' : 'lg:col-span-2'}>
            {loading ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
                <p className="text-gray-600">Loading news...</p>
              </div>
            ) : news.length > 0 ? (
              <NewsList 
                news={news} 
                mode="miniature" 
                currentLanguage="en"
                hideShowStatus={hideShowStatus}
                onHideShowChange={setHideShowStatus}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No news found.</p>
              </div>
            )}
          </div>
          
          {!hideShowStatus && (
            <div className="lg:col-span-1">
              <GetSocialBlock popularPosts={popularPosts} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
