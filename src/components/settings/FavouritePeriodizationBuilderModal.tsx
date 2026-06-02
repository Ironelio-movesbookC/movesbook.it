'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Period, PeriodizationTemplate, PeriodizationTemplateBuild } from '@/constants/tools.constants';
import { periodForLanguage } from '@/constants/tools.constants';
import PeriodizationTabPanel from '@/components/settings/PeriodizationTabPanel';
import PeriodizationOverviewPanel from '@/components/settings/PeriodizationOverviewPanel';
import {
  applyPeriodToWeekRange,
  virtualWeeksFromBuild,
  weekPeriodMapFromVirtualWeeks,
  type VirtualPlanWeek,
} from '@/utils/periodizationVirtualWeeks';
import { getAuthHeaders, getAuthToken } from '@/utils/auth.utils';
import type { PeriodizationAttachmentMeta } from '@/lib/periodizationAttachments';

type Subview = 'periodization' | 'overview';

type Props = {
  template: PeriodizationTemplate;
  onClose: () => void;
  onSaveTemplate: (build: PeriodizationTemplateBuild) => Promise<boolean>;
  /** User account: Overview tab can apply template to live yearly plan */
  allowApplyToYearlyPlan?: boolean;
};

export default function FavouritePeriodizationBuilderModal({
  template,
  onClose,
  onSaveTemplate,
  allowApplyToYearlyPlan = false,
}: Props) {
  const [subview, setSubview] = useState<Subview>('periodization');
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [allPeriods, setAllPeriods] = useState<Period[]>([]);
  const [draftWeeks, setDraftWeeks] = useState<VirtualPlanWeek[]>(() =>
    virtualWeeksFromBuild(template.build, [])
  );
  const [notesByPeriodId, setNotesByPeriodId] = useState<Record<string, string>>(
    () => ({ ...(template.build?.notesByPeriodId ?? {}) })
  );
  const [attachmentsByPeriodId, setAttachmentsByPeriodId] = useState<
    Record<string, PeriodizationAttachmentMeta[]>
  >(() => ({ ...(template.build?.attachmentsByPeriodId ?? {}) }) as Record<string, PeriodizationAttachmentMeta[]>);

  const lang = template.language || 'en';

  const periods = useMemo(
    () => allPeriods.map((p) => periodForLanguage(p, lang)),
    [allPeriods, lang]
  );

  useEffect(() => {
    setDraftWeeks(virtualWeeksFromBuild(template.build, periods));
    setNotesByPeriodId({ ...(template.build?.notesByPeriodId ?? {}) });
    setAttachmentsByPeriodId(
      ({ ...(template.build?.attachmentsByPeriodId ?? {}) }) as Record<string, PeriodizationAttachmentMeta[]>
    );
  }, [template.id, template.build, periods]);

  useEffect(() => {
    const load = async () => {
      setPeriodsLoading(true);
      try {
        const token = getAuthToken();
        if (!token) return;
        const res = await fetch('/api/workouts/periods', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllPeriods(Array.isArray(data.periods) ? data.periods : []);
        }
      } finally {
        setPeriodsLoading(false);
      }
    };
    void load();
  }, []);

  const handleDraftApply = useCallback(
    (periodId: string, weekStart: number, weekEnd: number) => {
      const period = periods.find((p) => p.id === periodId);
      if (!period) return;
      setDraftWeeks((prev) => applyPeriodToWeekRange(prev, period, weekStart, weekEnd));
    },
    [periods]
  );

  const buildPayload = useCallback(
    (extra?: Partial<PeriodizationTemplateBuild>): PeriodizationTemplateBuild => ({
      notesByPeriodId: { ...notesByPeriodId },
      attachmentsByPeriodId: { ...attachmentsByPeriodId },
      weekPeriodByNumber: weekPeriodMapFromVirtualWeeks(draftWeeks),
      ...extra,
    }),
    [notesByPeriodId, attachmentsByPeriodId, draftWeeks]
  );

  const handleSaveBuild = useCallback(async () => {
    return onSaveTemplate(buildPayload());
  }, [buildPayload, onSaveTemplate]);

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col bg-gray-100">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Build periodization — {template.name}</h2>
          <p className="text-xs text-gray-600">
            Sport: {template.sport} · Level: {template.level} · Language: {lang.toUpperCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-shrink-0 gap-1 border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={() => setSubview('periodization')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${
            subview === 'periodization'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500'
          }`}
        >
          Periodization
        </button>
        <button
          type="button"
          onClick={() => setSubview('overview')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${
            subview === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500'
          }`}
        >
          Overview
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {periodsLoading ? (
          <p className="text-sm text-gray-600">Loading periods…</p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
            No periods found. Add periods under Tools → Periods first (Super Admin), in language{' '}
            {lang.toUpperCase()}.
          </p>
        ) : subview === 'periodization' ? (
          <PeriodizationTabPanel
            periods={periods}
            favouriteDraft={{
              weeks: draftWeeks,
              onApplyPeriodRange: handleDraftApply,
              notesByPeriodId,
              onNotesChange: setNotesByPeriodId,
              attachmentsByPeriodId,
              onAttachmentsChange: setAttachmentsByPeriodId,
              onSaveBuild: handleSaveBuild,
            }}
          />
        ) : (
          <PeriodizationOverviewPanel
            periods={periods}
            favouriteDraft={{
              weeks: draftWeeks,
              notesByPeriodId,
              attachmentsByPeriodId,
            }}
            yearlyApply={
              allowApplyToYearlyPlan
                ? {
                    getBuild: buildPayload,
                    onApplied: onClose,
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
