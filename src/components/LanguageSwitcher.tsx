'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

// Map language codes to flag file names
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
    'ja': 'jap.png',      // Japanese flag
    'id': 'id.png',       // Indonesian flag
  };
  return flagMap[code] || 'en.png';
};

export default function LanguageSwitcher() {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangName = availableLanguages.find(lang => lang.code === currentLanguage)?.name || 'English';
  const currentFlagFile = getFlagFileName(currentLanguage);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 relative">
          <Image 
            src={`/flags/${currentFlagFile}`}
            alt={`${currentLangName} flag`}
            fill
            sizes="24px"
            className="object-cover"
          />
        </div>
        <span className="font-medium text-gray-700">{currentLanguage.toUpperCase()}</span>
        <span className="text-sm text-gray-500">|</span>
        <span className="text-sm text-gray-600">{currentLangName}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Select Language
            </div>
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                  currentLanguage === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 relative">
                  <Image 
                    src={`/flags/${getFlagFileName(lang.code)}`}
                    alt={`${lang.name} flag`}
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <span className="font-medium flex-1">{lang.name}</span>
                {currentLanguage === lang.code && (
                  <Check className="w-4 h-4 text-blue-700" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

