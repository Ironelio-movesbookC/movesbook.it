'use client';

import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Save,
  Settings,
  CalendarRange,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewsRightSidebar() {
  const { t } = useLanguage();

  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('sidebar_quick_actions')}
        </h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <Settings className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              Personal settings
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <Calendar className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              {t('sidebar_plan_new_workout')}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <CalendarDays className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              {t('sidebar_plan_3_weeks')}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <CalendarCheck className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              {t('sidebar_plan_of_year')}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <CheckSquare className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              {t('sidebar_log_completed')}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200 group">
            <Save className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700 text-left">
              {t('sidebar_save_session')}
            </span>
          </button>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4" />
              <h4 className="text-sm font-semibold">{t('sidebar_next_event')}</h4>
            </div>
            <button type="button" className="text-xs text-red-400 hover:text-red-300">
              {t('sidebar_see_all')}
            </button>
          </div>
          <div className="space-y-3 mt-3 border border-t-0 border-gray-200 rounded-b-lg p-3">
            <div>
              <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                <span>{t('sidebar_events_my_sports')}</span>
                <button type="button" className="text-red-600 hover:text-red-700">
                  {t('sidebar_see_all')}
                </button>
              </h5>
              <div className="space-y-1 px-3">
                <p className="text-xs text-gray-700">—</p>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                <span>{t('sidebar_my_friends_events')}</span>
                <button type="button" className="text-red-600 hover:text-red-700">
                  {t('sidebar_see_all')}
                </button>
              </h5>
              <div className="space-y-1 px-3">
                <p className="text-xs text-gray-700">—</p>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                <span>{t('sidebar_event_other_sport')}</span>
                <button type="button" className="text-red-600 hover:text-red-700">
                  {t('sidebar_see_all')}
                </button>
              </h5>
              <div className="space-y-1 px-3">
                <p className="text-xs text-gray-700">—</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg">
            <h4 className="text-sm font-semibold">{t('sidebar_news_by_friends')}</h4>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-3">
            <p className="text-xs text-gray-500">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}
