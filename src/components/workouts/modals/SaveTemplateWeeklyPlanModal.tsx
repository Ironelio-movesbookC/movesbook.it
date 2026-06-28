'use client';

import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import SaveTemplateWeeklyPlanMetadataModal from './SaveTemplateWeeklyPlanMetadataModal';

type SaveMode = 'favorite' | 'archive' | 'yearly';

type PeriodOption = { id: string; name: string };

interface SaveTemplateWeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: any;
  activeSubSection?: 'A' | 'B' | 'C';
  periods?: PeriodOption[];
  onAssignToYearlyPlan: (sourceWeek: any) => void;
  onSaved?: () => void;
}

const SAVE_MODES: Array<{
  id: SaveMode;
  label: React.ReactNode;
  Icon: () => React.ReactNode;
}> = [
  {
    id: 'favorite',
    label: (
      <>
        Save in <strong>Favourites</strong>
      </>
    ),
    Icon: FavoritesModeIcon,
  },
  {
    id: 'archive',
    label: (
      <>
        Save in <strong>General Archive</strong> of workouts
      </>
    ),
    Icon: GeneralArchiveModeIcon,
  },
  {
    id: 'yearly',
    label: (
      <>
        Save in <strong>Current Yearly Plan</strong> (select the week)
      </>
    ),
    Icon: YearlyModeIcon,
  },
];

function FavoritesModeIcon() {
  return (
    <div className="w-14 h-14 relative shrink-0">
      <div className="absolute inset-0 rounded-lg border-2 border-gray-300 bg-white grid grid-cols-3 gap-px p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-[1px]" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl leading-none" aria-hidden>
          ❤️
        </span>
      </div>
    </div>
  );
}

function GeneralArchiveModeIcon() {
  return (
    <div className="w-14 h-14 relative shrink-0">
      <div className="absolute inset-0 rounded-lg border-2 border-gray-300 bg-white grid grid-cols-3 gap-px p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-[1px]" />
        ))}
      </div>
      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center border-2 border-white">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}

function YearlyModeIcon() {
  return (
    <div className="w-14 h-14 rounded-lg border-2 border-blue-400 overflow-hidden shrink-0 grid grid-rows-4">
      <div className="bg-blue-500" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid grid-cols-3 border-t border-blue-200">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className={
                'border-r border-blue-100 ' +
                (row === 1 && col === 1
                  ? 'bg-emerald-400'
                  : row === 2 && col === 0
                    ? 'bg-emerald-300'
                    : 'bg-emerald-50')
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SaveTemplateWeeklyPlanModal({
  isOpen,
  onClose,
  sourceWeek,
  activeSubSection = 'A',
  periods = [],
  onAssignToYearlyPlan,
  onSaved,
}: SaveTemplateWeeklyPlanModalProps) {
  const [activeMode, setActiveMode] = useState<SaveMode | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveMode(null);
  }, [isOpen, sourceWeek?.id]);

  const handleModeSelect = (mode: SaveMode) => {
    if (mode === 'yearly') {
      onClose();
      onAssignToYearlyPlan(sourceWeek);
      return;
    }
    setActiveMode(mode);
  };

  if (!isOpen || !sourceWeek) return null;

  if (activeMode === 'favorite' || activeMode === 'archive') {
    return (
      <SaveTemplateWeeklyPlanMetadataModal
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setActiveMode(null)}
        sourceWeek={sourceWeek}
        mode={activeMode}
        activeSubSection={activeSubSection}
        periods={periods}
        onSaved={onSaved}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Save Template Weekly Plan in..</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            <div className="space-y-3">
              {SAVE_MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleModeSelect(id)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg text-left hover:border-purple-400 hover:bg-purple-50/30 transition-all"
                >
                  <Icon />
                  <span className="text-sm font-semibold text-gray-800 leading-snug">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
