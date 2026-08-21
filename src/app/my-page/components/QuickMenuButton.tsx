'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileDropdownMenu from './ProfileDropdownMenu';

type Props = {
  onLogout?: () => void;
  /** Compact control for the dark top navbar. */
  variant?: 'toolbar' | 'navbar';
};

export default function QuickMenuButton({ onLogout, variant = 'navbar' }: Props) {
  const { t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const label = t('nav_quick_menu');

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const isNavbar = variant === 'navbar';

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <motion.button
        type="button"
        onClick={() => setDropdownOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-label={label}
        className={`flex items-center gap-1.5 rounded-md border text-xs font-semibold whitespace-nowrap ${
          isNavbar
            ? `px-2 py-1.5 ${
                dropdownOpen
                  ? 'border-cyan-300 bg-white/15 text-white ring-2 ring-cyan-300/30'
                  : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              }`
            : `px-3 py-2 text-sm ${
                dropdownOpen
                  ? 'border-[#7092BE] bg-[#7092BE]/10 text-[#7092BE] ring-2 ring-[#7092BE]/20'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-[#8b8e9b3b]'
              }`
        }`}
      >
        <Settings className="h-4 w-4" />
        <span>{label}</span>
        <motion.div
          animate={{ rotate: dropdownOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 18, mass: 0.6 }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20, mass: 0.8 }}
            className="absolute right-0 top-full z-[200] mt-2 w-[320px] max-w-[calc(100vw-2rem)]"
          >
            <ProfileDropdownMenu onClose={() => setDropdownOpen(false)} onLogout={onLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
