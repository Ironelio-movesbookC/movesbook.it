'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { DOCUMENT_TYPES } from '@/lib/news/mappings';

interface NewsItem {
  id: string;
  title: string | null;
  section: string | null;
  documentType: string | null;
  date: string;
  langValueId: string | null;
  writerUsername: string | null;
  author: string | null;
  originalAuthor: string | null;
  method: string | null;
  category: {
    categoryName: string;
  } | null;
  originalLanguage: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  categoryName: string;
}

interface Language {
  id: string;
  name: string;
}

export default function NewsIndexAllPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  
  const getDocumentTypeLabel = (value: string | null): string => {
    if (!value) return '-';
    const type = DOCUMENT_TYPES.find(t => t.value === value);
    return type ? type.label : value;
  };
  
  const [filters, setFilters] = useState({
    search: '',
    section: '',
    documentType: '',
    fromDate: '',
    toDate: '',
    language: '',
    method: '',
    categoryId: '',
  });

  useEffect(() => {
    const checkAdminAuth = () => {
      try {
        const adminData = localStorage.getItem('adminUser');
        if (adminData) {
          const parsed = JSON.parse(adminData);
          setAdminUser(parsed);
        }
      } catch (error) {
        console.error('Error parsing admin user:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (!loading && !authLoading) {
      const isAdmin = (user && user.userType === 'ADMIN') || (adminUser && adminUser.userType === 'ADMIN');
      if (!isAdmin) {
        router.push('/');
      }
    }
  }, [user, adminUser, loading, authLoading, router]);

  useEffect(() => {
    const isAdmin = (user && user.userType === 'ADMIN') || (adminUser && adminUser.userType === 'ADMIN');
    if (isAdmin && !authLoading) {
      fetchData();
    }
  }, [user, adminUser, authLoading]);

  useEffect(() => {
    const isAdmin = (user && user.userType === 'ADMIN') || (adminUser && adminUser.userType === 'ADMIN');
    if (isAdmin && !authLoading) {
      setPage(1);
    }
  }, [filters]);

  useEffect(() => {
    const isAdmin = (user && user.userType === 'ADMIN') || (adminUser && adminUser.userType === 'ADMIN');
    if (isAdmin && !authLoading) {
      fetchNews();
    }
  }, [page, filters, user, adminUser, authLoading]);

  const fetchData = async () => {
    try {
      const [categoriesRes, languagesRes] = await Promise.all([
        fetch('/api/public/news/categories'),
        fetch('/api/public/news/languages'),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data || []);
      }

      if (languagesRes.ok) {
        const data = await languagesRes.json();
        setLanguages(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.section) params.append('section', filters.section);
      if (filters.documentType) params.append('documentType', filters.documentType);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.language) params.append('language', filters.language);
      if (filters.method) params.append('method', filters.method);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);

      const res = await fetch(`/api/news?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch news');

      const data = await res.json();
      setNews(data.news || []);
      setFilteredNews(data.news || []);
      setTotalPages(data.pagination?.totalPages || 1);
      
      if (data.pagination) {
        setPaginationData(data.pagination);
      }

      const uniqueSections = Array.from(new Set<string>(
        (data.news || []).map((item: NewsItem) => item.section).filter((s: string | null): s is string => s !== null)
      ));
      setSections(uniqueSections);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news article?')) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const res = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete news');

      fetchNews();
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Failed to delete news article');
    }
  };

  if (loading || authLoading || isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('news_archive')}</h1>
          <Link
            href="/news/add"
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('news_add_article')}</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('btn_search')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('news_search_placeholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_section')}</label>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_section')}s</option>
                {sections.map((section) => (
                  <option key={section} value={section} className="text-gray-900">
                    {section}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_document_type')}</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_document_type')}s</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="text-gray-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_method')}</label>
              <select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_method')}s</option>
                <option value="Typed" className="text-gray-900">Typed</option>
                <option value="Pasted" className="text-gray-900">Pasted</option>
                <option value="Shared" className="text-gray-900">Shared</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_from_date')}</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_to_date')}</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('news_language')}</label>
              <select
                value={filters.language}
                onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_language')}s</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id} className="text-gray-900">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="text-gray-900">
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Writer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNews.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No news articles found
                    </td>
                  </tr>
                ) : (
                  filteredNews.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.section || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.title || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category?.categoryName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getDocumentTypeLabel(item.documentType)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.originalLanguage?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.author || item.originalAuthor || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.method || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/news/edit/${item.id}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing {news.length > 0 ? ((page - 1) * 20 + 1) : 0} to {Math.min(page * 20, paginationData?.total || 0)} of {paginationData?.total || 0} results
              </div>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm"
                    title="First page"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages: (number | string)[] = [];
                      const adjacents = 2;
                      
                      if (totalPages <= 7 + (adjacents * 2)) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        if (page < 1 + (adjacents * 2)) {
                          for (let i = 1; i < 4 + (adjacents * 2); i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(totalPages - 1);
                          pages.push(totalPages);
                        } else if (totalPages - (adjacents * 2) > page && page > (adjacents * 2)) {
                          pages.push(1);
                          pages.push(2);
                          pages.push('...');
                          for (let i = page - adjacents; i <= page + adjacents; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(totalPages - 1);
                          pages.push(totalPages);
                        } else {
                          pages.push(1);
                          pages.push(2);
                          pages.push('...');
                          for (let i = totalPages - (2 + (adjacents * 2)); i <= totalPages; i++) {
                            pages.push(i);
                          }
                        }
                      }
                      
                      return pages.map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        const pageNum = p as number;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 min-w-[40px] border rounded-lg transition-colors text-sm ${
                              page === pageNum
                                ? 'bg-blue-600 text-white border-blue-600 font-medium'
                                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm"
                    title="Last page"
                  >
                    »»
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
