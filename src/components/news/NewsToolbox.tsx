'use client';

import { Search, Filter, X } from 'lucide-react';
import { useState, useEffect } from 'react';
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

interface NewsToolboxProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  onShow: () => void;
  categories: Category[];
  sports: Sport[];
  languages: Language[];
}

export default function NewsToolbox({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSport,
  setSelectedSport,
  selectedLanguage,
  setSelectedLanguage,
  onShow,
  categories,
  sports,
  languages,
}: NewsToolboxProps) {
  const { t } = useLanguage();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = selectedCategory || selectedSport || selectedLanguage || searchQuery;

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSport('');
    setSelectedLanguage('');
    setSearchQuery('');
    onShow();
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('news_archive')}</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full sm:w-auto"
        >
          <Filter className="w-4 h-4" />
          <span className="sm:inline">{showFilters ? t('news_hide_filters') : t('news_show_filters')}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('news_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onShow();
              }
            }}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={onShow}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
        >
          {t('news_search')}
        </button>
      </div>

      {showFilters && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ color: '#111827' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('news_category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  onShow();
                }}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="" className="text-gray-900">{t('news_all_categories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="text-gray-900">
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('news_sport')}
              </label>
              <select
                value={selectedSport}
                onChange={(e) => {
                  setSelectedSport(e.target.value);
                  onShow();
                }}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_sport')}s</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id} className="text-gray-900">
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('news_language')}
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  onShow();
                }}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="" className="text-gray-900">{t('news_all')} {t('news_language')}s</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id} className="text-gray-900">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                {t('news_clear_filters')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
