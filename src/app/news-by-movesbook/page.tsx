'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import NewsList from '@/components/news/NewsList';
import GetSocialBlock from '@/components/news/GetSocialBlock';
import NewsToolbox from '@/components/news/NewsToolbox';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

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
  feturedNews?: string;
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
  user?: {
    id: string;
    username: string;
    image: string | null;
    firstname?: string | null;
    lastname?: string | null;
  } | null;
}


function PublicNewsListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [popularPosts, setPopularPosts] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideShowStatus, setHideShowStatus] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const hasFetchedDropdownDataRef = useRef(false);
  const fetchingNewsRef = useRef(false);
  const hasFetchedPopularPostsRef = useRef(false);

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const adminData = localStorage.getItem('adminUser');
        if (adminData) {
          const parsed = JSON.parse(adminData);
          setAdminUser(parsed);
        }
      } catch (error) {
        console.error('Error parsing admin user:', error);
      }
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      const admin = (user && user.userType === 'ADMIN') || (adminUser && adminUser.userType === 'ADMIN');
      setIsAdmin(admin || false);
    }
  }, [user, adminUser, authLoading]);
  
  useEffect(() => {
    const categoryId = searchParams?.get('categoryId') || searchParams?.get('category') || '';
    const sportId = searchParams?.get('sportId') || searchParams?.get('sport') || '';
    const languageId = searchParams?.get('languageId') || searchParams?.get('language') || '';
    const search = searchParams?.get('search') || '';
    const page = parseInt(searchParams?.get('page') || '1');
    const limit = parseInt(searchParams?.get('limit') || '10');
    
    setSearchQuery(search);
    setSelectedCategory(categoryId);
    setSelectedSport(sportId);
    setSelectedLanguage(languageId);
    setPagination(prev => ({
      ...prev,
      limit,
      page,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (hasFetchedDropdownDataRef.current) return;
    hasFetchedDropdownDataRef.current = true;
    
    const fetchData = async () => {
      try {
        const [categoriesRes, sportsRes, languagesRes] = await Promise.all([
          fetch('/api/public/news/categories'),
          fetch('/api/public/news/sports'),
          fetch('/api/public/news/languages'),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data);
        }

        if (sportsRes.ok) {
          const data = await sportsRes.json();
          setSports(data);
        }

        if (languagesRes.ok) {
          const data = await languagesRes.json();
          setLanguages(data);
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (fetchingNewsRef.current) return;
    
    const fetchNews = async () => {
      fetchingNewsRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedCategory) params.append('categoryId', selectedCategory);
        if (selectedSport) params.append('sportId', selectedSport);
        if (selectedLanguage) params.append('languageId', selectedLanguage);
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());

        const res = await fetch(`/api/public/news?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data.news || []);
          setPagination(prev => data.pagination || prev);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
        fetchingNewsRef.current = false;
      }
    };

    fetchNews();
  }, [searchQuery, selectedCategory, selectedSport, selectedLanguage, pagination.page, pagination.limit]);

  useEffect(() => {
    const fetchPopularPosts = async () => {
      try {
        const currentLanguage = languages.find(l => l.id === selectedLanguage)?.code || 
                               languages.find(l => l.code === 'en')?.code || 
                               'en';
        const res = await fetch(`/api/public/news/popular?limit=4&language=${currentLanguage}`);
        if (res.ok) {
          const data = await res.json();
          setPopularPosts(data.popularPosts || []);
        }
      } catch (error) {
        console.error('Error fetching popular posts:', error);
      }
    };

    if (languages.length > 0) {
      fetchPopularPosts();
    }
  }, [languages, selectedLanguage]);

  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedSport) params.set('sportId', selectedSport);
    if (selectedLanguage) params.set('languageId', selectedLanguage);
    if (pagination.limit) params.set('limit', pagination.limit.toString());
    if (pagination.page) params.set('page', pagination.page.toString());
    router.push(`/news-by-movesbook?${params.toString()}`);
  };

  const handleShow = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    updateUrlParams();
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
    updateUrlParams();
  };


  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    updateUrlParams();
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Link
            href="/news-by-movesbook/add"
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('news_add_article')}</span>
          </Link>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className={hideShowStatus ? 'lg:col-span-3' : 'lg:col-span-2'}>
          {loading ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 text-center">
              <p className="text-gray-600">{t('news_loading')}</p>
            </div>
          ) : news.length > 0 ? (
            <NewsList 
              news={news} 
              mode="default" 
              currentLanguage={languages.find(l => l.id === selectedLanguage)?.code || 'en'}
              hideShowStatus={hideShowStatus}
              onHideShowChange={setHideShowStatus}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 text-center">
              <p className="text-gray-600">{t('news_no_news_found')}</p>
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
  );
}

export default function PublicNewsListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <PublicNewsListPageContent />
    </Suspense>
  );
}
