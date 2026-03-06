'use client';

import { Search, Filter, X, Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
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
  setSearchQuery: Dispatch<SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  selectedSport: string;
  setSelectedSport: Dispatch<SetStateAction<string>>;
  selectedLanguage: string;
  setSelectedLanguage: Dispatch<SetStateAction<string>>;
  onShow: () => void;

  categories?: Category[];
  sports?: Sport[];
  languages?: Language[];
}

const getFlagFileName = (code: string): string => {
  const flagMap: Record<string, string> = {
    'en': 'en.png',
    'fr': 'fr.png',
    'de': 'de.png',
    'it': 'it.png',
    'es': 'es.png',
    'pt': 'por.png',
    'ru': 'rus.png',
    'hi': 'ind.png',
    'zh': 'chin.png',
    'ar': 'arab.png',
    'ja': 'jap.png',
    'id': 'id.png',
  };
  return flagMap[code] || 'en.png';
};

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
  categories = [],
  sports = [],
  languages = [],
}: NewsToolboxProps) {
  const { t } = useLanguage();
  const [showFilters, setShowFilters] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = selectedCategory || selectedSport || selectedLanguage || searchQuery;
  const selectedLang = languages.find(l => l.id === selectedLanguage);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSport('');
    setSelectedLanguage('');
    setSearchQuery('');
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
                onChange={(e) => setSelectedCategory(e.target.value)}
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
                onChange={(e) => setSelectedSport(e.target.value)}
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
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedLang ? (
                    <>
                      <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 relative">
                        <Image
                          src={`/flags/${getFlagFileName(selectedLang.code)}`}
                          alt={selectedLang.name}
                          fill
                          sizes="20px"
                          className="object-cover"
                        />
                      </div>
                      <span className="flex-1 text-left text-sm">{selectedLang.name}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-left text-sm text-gray-500">{t('news_all')} {t('news_language')}s</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {showLangDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setSelectedLanguage(''); setShowLangDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${selectedLanguage === '' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                    >
                      <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1 text-left">{t('news_all')} {t('news_language')}s</span>
                      {selectedLanguage === '' && <span className="text-blue-600 text-xs">✓</span>}
                    </button>
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => { setSelectedLanguage(lang.id); setShowLangDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${selectedLanguage === lang.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      >
                        <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 relative">
                          <Image
                            src={`/flags/${getFlagFileName(lang.code)}`}
                            alt={lang.name}
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm font-medium flex-1 text-left">{lang.name}</span>
                        {selectedLanguage === lang.id && <span className="text-blue-600 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
