'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Newspaper, Home, List, Grid, FolderOpen, Monitor } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  id: string;
  categoryName: string;
}

interface NewsLeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  categories?: Category[];
}

export default function NewsLeftSidebar({ isOpen, onToggle, categories = [] }: NewsLeftSidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (categories.length > 0) {
      setLocalCategories(categories);
      setLoading(false);
      hasFetchedRef.current = true;
      return;
    }
    
    if (!hasFetchedRef.current) {
      setLoading(true);
      hasFetchedRef.current = true;
      const fetchCategories = async () => {
        try {
          const res = await fetch('/api/public/news/categories');
          if (res.ok) {
            const data = await res.json();
            setLocalCategories(data);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchCategories();
    }
  }, [pathname, categories]);

  const isActive = (path: string) => {
    if (path === '/news-by-movesbook' && pathname === '/news-by-movesbook') return true;
    if (path !== '/news-by-movesbook' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {isOpen ? (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              {t('nav_news')}
            </h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {t('news_view_modes')}
                </h3>
                  <div className="space-y-1">
                    <Link
                      href="/news-by-movesbook"
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/news-by-movesbook') && pathname === '/news-by-movesbook'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>{t('news_default_view')}</span>
                    </Link>
                    <Link
                      href="/news-by-movesbook/list"
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/news-by-movesbook/list')
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>{t('news_list_view')}</span>
                    </Link>
                    <Link
                      href="/news-by-movesbook/miniature"
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/news-by-movesbook/miniature')
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                      <span>{t('news_miniature_view')}</span>
                    </Link>
                    <Link
                      href="/news-by-movesbook/section"
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/news-by-movesbook/section')
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{t('news_section_view')}</span>
                    </Link>
                    <Link
                      href="/news-by-movesbook/browser"
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/news-by-movesbook/browser')
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>{t('news_browser_view')}</span>
                    </Link>
                  </div>
                </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {t('news_category')}s
                </h3>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link
                      href="/news-by-movesbook"
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        !searchParams?.get('categoryId')
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('news_all_categories')}
                    </Link>
                    {localCategories.map((category) => {
                      const currentCategoryId = searchParams?.get('categoryId') || '';
                      const isCategoryActive = currentCategoryId === category.id;
                      return (
                        <Link
                          key={category.id}
                          href={`/news-by-movesbook?categoryId=${category.id}`}
                          className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                            isCategoryActive
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {category.categoryName}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      ) : (
        <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}
    </>
  );
}
