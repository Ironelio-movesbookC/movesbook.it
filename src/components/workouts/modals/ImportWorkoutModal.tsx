'use client';

import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import ImportWorkoutFromTemplateModal from './ImportWorkoutFromTemplateModal';
import ImportWorkoutFavoriteModal from './ImportWorkoutFavoriteModal';
import ImportWorkoutFromPlanModal from './ImportWorkoutFromPlanModal';
import ImportWorkoutArchiveModal from './ImportWorkoutArchiveModal';
import ImportWorkoutSharedUsersModal from './ImportWorkoutSharedUsersModal';
import ImportWorkoutSharedFriendsModal from './ImportWorkoutSharedFriendsModal';
import ImportWorkoutFromStructureModal from './ImportWorkoutFromStructureModal';
import ImportWorkoutFromCoachAnnualModal from './ImportWorkoutFromCoachAnnualModal';
import ImportWorkoutStubModal from './ImportWorkoutStubModal';

export type ImportWorkoutSourceKind =
  | { type: 'session'; sourceWorkoutId: string }
  | { type: 'favorite'; favoriteId: string }
  | { type: 'global_archive'; globalEntryId: string }
  | {
      type: 'weekly_structure';
      planKey: string;
      planData: import('@/lib/weeklyStructureTypes').WeeklyStructurePlanPersist;
      structureDayOfWeek: number;
      structureSessionNumber: number;
    }
  | {
      type: 'coach_annual';
      globalEntryId: string;
      coachWeekNumber: number;
      coachDayOfWeek: number;
      coachSessionNumber: number;
      anchorWeekNumber: number;
      maxWeekNumber?: number;
    };

export type ImportWorkoutPayload = {
  targetDayId: string;
  sessionNumber: number;
  overwrite: boolean;
  source: ImportWorkoutSourceKind;
};

type ImportMode =
  | 'templates'
  | 'structure'
  | 'favorite'
  | 'yearly'
  | 'general_archive'
  | 'coach_annual'
  | 'shared_users'
  | 'shared_friends';

interface ImportWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDay: { id: string; date?: string; weekNumber?: number };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  activeSection: 'A' | 'B' | 'C' | 'D';
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
}

const IMPORT_MODES: Array<{ id: ImportMode; label: string; Icon: () => React.ReactNode }> = [
  { id: 'templates', label: 'Import from Templates weekly plans', Icon: TemplateModeIcon },
  { id: 'structure', label: 'Import from Weekly workouts structures', Icon: StructureModeIcon },
  { id: 'favorite', label: 'Import from Favourites', Icon: FavoritesModeIcon },
  { id: 'yearly', label: 'Import from Current Yearly Plan', Icon: YearlyModeIcon },
  { id: 'general_archive', label: 'Import from General Archive', Icon: GeneralArchiveModeIcon },
  { id: 'coach_annual', label: "Import from Your Coach's Annual Plan", Icon: CoachModeIcon },
  { id: 'shared_users', label: 'Import from shared by users', Icon: SharedUsersModeIcon },
  { id: 'shared_friends', label: 'Import from shared by your friends', Icon: SharedFriendsModeIcon },
];

function TemplateModeIcon() {
  return (
    <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0">
      <div className="h-4 bg-blue-500" />
      <div className="h-10 bg-orange-400 flex items-end justify-center gap-0.5 p-1">
        <div className="w-2 h-3 bg-white/70 rounded-sm" />
        <div className="w-2 h-5 bg-white/90 rounded-sm" />
        <div className="w-2 h-4 bg-white/80 rounded-sm" />
      </div>
    </div>
  );
}

function StructureModeIcon() {
  return (
    <div className="w-14 h-14 flex flex-col items-center justify-center shrink-0">
      <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-red-500" />
      <div className="flex gap-3 mt-1">
        <div className="w-4 h-4 rounded-full bg-red-500" />
        <div className="w-4 h-4 rounded-full bg-red-500" />
      </div>
      <div className="flex gap-4 mt-1">
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
      </div>
    </div>
  );
}

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
                (row === 1 && col === 1 ? 'bg-orange-300' : 'bg-orange-50')
              }
            />
          ))}
        </div>
      ))}
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
      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}

function CoachModeIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-b from-sky-100 to-sky-200 border-2 border-sky-300 flex items-center justify-center shrink-0 overflow-hidden">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto rounded-full bg-amber-700 relative">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-3 bg-red-500 rounded-t-full" />
        </div>
        <div className="w-6 h-3 mx-auto -mt-1 bg-blue-600 rounded-b-md" />
      </div>
    </div>
  );
}

function SharedUsersModeIcon() {
  return (
    <div className="w-14 h-14 relative shrink-0">
      <div className="absolute inset-0 rounded-lg border-2 border-gray-300 bg-white grid grid-cols-3 gap-px p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-[1px]" />
        ))}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center border-2 border-white text-white text-xs font-bold">
        ⤴
      </div>
    </div>
  );
}

function SharedFriendsModeIcon() {
  return (
    <div className="w-14 h-14 flex items-end justify-center gap-0.5 shrink-0">
      <div className="w-4 h-8 bg-blue-400 rounded-t-full" />
      <div className="w-5 h-10 bg-indigo-500 rounded-t-full" />
      <div className="w-4 h-8 bg-teal-500 rounded-t-full" />
    </div>
  );
}

export default function ImportWorkoutModal({
  isOpen,
  onClose,
  targetDay,
  targetWorkout,
  activeSection,
  onConfirm,
}: ImportWorkoutModalProps) {
  const [showTemplateImport, setShowTemplateImport] = useState(false);
  const [showStructureImport, setShowStructureImport] = useState(false);
  const [showFavorite, setShowFavorite] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSharedUsers, setShowSharedUsers] = useState(false);
  const [showSharedFriends, setShowSharedFriends] = useState(false);
  const [showCoachAnnual, setShowCoachAnnual] = useState(false);
  const [stubMode, setStubMode] = useState<ImportMode | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setShowTemplateImport(false);
    setShowStructureImport(false);
    setShowFavorite(false);
    setShowPlan(false);
    setShowArchive(false);
    setShowSharedUsers(false);
    setShowSharedFriends(false);
    setShowCoachAnnual(false);
    setStubMode(null);
  }, [isOpen, targetWorkout.id]);

  const handleModeSelect = (mode: ImportMode) => {
    if (mode === 'templates') {
      setShowTemplateImport(true);
      return;
    }
    if (mode === 'structure') {
      setShowStructureImport(true);
      return;
    }
    if (mode === 'favorite') {
      setShowFavorite(true);
      return;
    }
    if (mode === 'yearly') {
      setShowPlan(true);
      return;
    }
    if (mode === 'general_archive') {
      setShowArchive(true);
      return;
    }
    if (mode === 'shared_users') {
      setShowSharedUsers(true);
      return;
    }
    if (mode === 'shared_friends') {
      setShowSharedFriends(true);
      return;
    }
    if (mode === 'coach_annual') {
      setShowCoachAnnual(true);
      return;
    }
    setStubMode(mode);
  };

  const commonProps = {
    isOpen,
    onClose,
    targetDay,
    targetWorkout,
    activeSection,
    onConfirm,
  };

  if (!isOpen) return null;

  if (showStructureImport) {
    return (
      <ImportWorkoutFromStructureModal
        {...commonProps}
        onBack={() => setShowStructureImport(false)}
      />
    );
  }

  if (showTemplateImport) {
    return (
      <ImportWorkoutFromTemplateModal
        {...commonProps}
        onBack={() => setShowTemplateImport(false)}
      />
    );
  }

  if (showSharedFriends) {
    return (
      <ImportWorkoutSharedFriendsModal
        {...commonProps}
        onBack={() => setShowSharedFriends(false)}
      />
    );
  }

  if (showSharedUsers) {
    return (
      <ImportWorkoutSharedUsersModal
        {...commonProps}
        onBack={() => setShowSharedUsers(false)}
      />
    );
  }

  if (showArchive) {
    return (
      <ImportWorkoutArchiveModal {...commonProps} onBack={() => setShowArchive(false)} />
    );
  }

  if (showPlan) {
    return (
      <ImportWorkoutFromPlanModal
        {...commonProps}
        planTypeOverride="YEARLY_PLAN"
        onBack={() => setShowPlan(false)}
      />
    );
  }

  if (showFavorite) {
    return (
      <ImportWorkoutFavoriteModal {...commonProps} onBack={() => setShowFavorite(false)} />
    );
  }

  if (showCoachAnnual) {
    return (
      <ImportWorkoutFromCoachAnnualModal
        {...commonProps}
        onBack={() => setShowCoachAnnual(false)}
      />
    );
  }

  if (stubMode) {
    const labels: Record<string, string> = {};
    return (
      <ImportWorkoutStubModal
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setStubMode(null)}
        title={labels[stubMode] ?? stubMode}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
                <p className="text-sm text-sky-900">
                  You can select from where source you want to proceed with the import of the data
                  requested
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Import mode</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IMPORT_MODES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleModeSelect(id)}
                      className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg text-left hover:border-blue-400 hover:bg-blue-50/40 transition-all min-h-[72px]"
                    >
                      <Icon />
                      <span className="text-sm font-medium text-gray-800 leading-snug">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Importing into Workout #{targetWorkout.sessionNumber} on this day.
              </p>
            </div>
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
