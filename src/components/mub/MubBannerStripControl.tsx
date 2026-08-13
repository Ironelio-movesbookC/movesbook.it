'use client';

import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

/** Banner-strip MUB — label = view, gear = settings (separate targets). */
export default function MubBannerStripControl() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.push('/users/mub_page')}
        className="text-lime-400 hover:text-lime-300 transition-colors"
      >
        {t('sidebar_most_used_buttons')}
      </button>
      <button
        type="button"
        onClick={() => router.push('/users/mub_page?edit=1')}
        className="inline-flex text-gray-400 hover:text-gray-200 transition-colors"
        aria-label={t('sidebar_options')}
        title={t('sidebar_options')}
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}
