'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Globe, Share2 } from 'lucide-react';
import { SPORTS_LIST, getSportDisplayName } from '@/constants/moveframe.constants';
import {
  GOAL_OPTIONS,
  TRAINING_LEVELS,
  getGoalLabel,
  getPlanGymWeekTrainingLevelLabel,
  type GoalId,
  type TrainingLevel,
} from './PlanGymWeekModal';
import { ARCHIVE_DISPLAY_LANGUAGES } from '@/types/workoutArchiveGrid';
import type { WeeklyPlanShareSourceType } from '@/lib/globalWeeklyPlanShare';
import {
  computeWeeklyPlanMetrics,
  formatArchiveDuration,
} from '@/lib/workoutArchiveMetrics';
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';
import { Users } from 'lucide-react';

export type ShareWeeklyPlanFormValues = {
  title: string;
  mainSport: string;
  mainGoal: string;
  trainingLevel: string;
  period: string;
  originalLanguages: string;
  shortDescription: string;
  expirationDate: string;
};

type PeriodOption = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: any;
  sourcePlanType: WeeklyPlanShareSourceType;
  sourceLabel?: string;
  periods?: PeriodOption[];
  onShared?: () => void;
};

function defaultExpirationDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function inferSportFromWeek(week: any): string {
  for (const day of week?.days ?? []) {
    for (const workout of day.workouts ?? []) {
      if (workout.mainSport) return workout.mainSport;
      const sport = workout.sports?.[0]?.sport ?? workout.moveframes?.[0]?.sport;
      if (sport) return sport;
    }
  }
  return SPORTS_LIST[0] ?? 'running';
}

export default function ShareWeeklyPlanToGlobalModal({
  isOpen,
  onClose,
  sourceWeek,
  sourcePlanType,
  sourceLabel,
  periods = [],
  onShared,
}: Props) {
  const [title, setTitle] = useState('');
  const [mainSport, setMainSport] = useState('');
  const [mainGoal, setMainGoal] = useState<GoalId>('hypertrophy');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('intermediate');
  const [period, setPeriod] = useState('');
  const [language, setLanguage] = useState('en');
  const [shortDescription, setShortDescription] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [noExpiration, setNoExpiration] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorProfile, setAuthorProfile] = useState<{
    username: string;
    avatarUrl: string | null;
    countryName: string;
    countryFlag: string;
  }>({ username: '—', avatarUrl: null, countryName: '—', countryFlag: '' });

  const weekMetrics = useMemo(
    () =>
      computeWeeklyPlanMetrics({
        weeks: [{ days: sourceWeek?.days ?? [] }],
      }),
    [sourceWeek]
  );

  const planCreatedAt = sourceWeek?.createdAt
    ? new Date(sourceWeek.createdAt)
    : null;
  const [sharingDatePreview, setSharingDatePreview] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen || !sourceWeek) return;
    setSharingDatePreview(new Date());
    const weekNum = sourceWeek.weekNumber ?? '?';
    setTitle('Week ' + weekNum + ' — shared plan');
    setMainSport(inferSportFromWeek(sourceWeek));
    setMainGoal('hypertrophy');
    setTrainingLevel('intermediate');
    setPeriod(sourceWeek.period?.name ?? periods[0]?.name ?? '');
    setLanguage('en');
    setShortDescription('');
    setExpirationDate(defaultExpirationDate());
    setNoExpiration(true);
    setError(null);

    void (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user ?? data;
        const countryFields = resolveAuthorCountryFields(user.country);
        setAuthorProfile({
          username: user.username?.trim() || user.name?.trim() || 'User',
          avatarUrl: user.image ?? null,
          countryName: countryFields.authorCountryName ?? user.country?.trim() ?? '—',
          countryFlag: countryFields.authorCountryFlag ?? '',
        });
      } catch {
        /* keep defaults */
      }
    })();
  }, [isOpen, sourceWeek, periods]);

  const handleShare = async () => {
    if (!sourceWeek?.id) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!mainSport.trim()) {
      setError('Main sport is required.');
      return;
    }
    if (!period.trim()) {
      setError('Period is required.');
      return;
    }
    if (!shortDescription.trim()) {
      setError('Short description is required.');
      return;
    }
    if (!noExpiration && !expirationDate) {
      setError('Select an expiration date or choose no expiration.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first.');
      return;
    }

    setIsSharing(true);
    setError(null);
    try {
      const res = await fetch('/api/workouts/share-to-global', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordType: 'WEEKLY_PLAN',
          sourceId: sourceWeek.id,
          sourcePlanType,
          title: title.trim(),
          mainSport: mainSport.trim(),
          mainGoal: getGoalLabel(mainGoal),
          trainingLevel: getPlanGymWeekTrainingLevelLabel(trainingLevel),
          period: period.trim(),
          originalLanguages: language,
          shortDescription: shortDescription.trim(),
          expirationDate: noExpiration ? undefined : expirationDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share weekly plan');
      }
      alert(
        data.message ||
          'Your weekly plan is now in the Global archive of shared workouts & weekly plans.'
      );
      onShared?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen || !sourceWeek) return null;

  const label =
    sourceLabel ??
    (sourcePlanType === 'ARCHIVE'
      ? 'Archive Week ' + (sourceWeek.weekNumber ?? '?')
      : 'Yearly Plan, Week ' + (sourceWeek.weekNumber ?? '?'));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-slate-600 to-slate-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <h2 className="text-lg font-bold">Share weekly plan with Movesbook users</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isSharing}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <strong>{label}</strong> will be copied to the{' '}
              <strong>Global archive of shared workouts &amp; weekly plans</strong>. Other Movesbook
              users can find it when they open that section or import shared plans.
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Automatically added when sharing
              </p>
              <div className="flex items-start gap-3">
                {authorProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authorProfile.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {authorProfile.username}
                    {authorProfile.countryFlag ? (
                      <span className="ml-1.5">{authorProfile.countryFlag}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-600">{authorProfile.countryName}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Workouts</span>
                  <span className="font-semibold text-gray-900">{weekMetrics.workoutCount}</span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total meters</span>
                  <span className="font-semibold text-gray-900">
                    {weekMetrics.totalMeters > 0 ? weekMetrics.totalMeters + ' m' : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total time</span>
                  <span className="font-semibold text-gray-900">
                    {formatArchiveDuration(weekMetrics.totalTimeSeconds)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total series</span>
                  <span className="font-semibold text-gray-900">
                    {weekMetrics.totalSeries > 0 ? weekMetrics.totalSeries : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Date of creation</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {planCreatedAt
                      ? planCreatedAt.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Date of sharing</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {sharingDatePreview.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Complete the fields below to confirm sharing.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Title *</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Main sport *</span>
                <select
                  value={mainSport}
                  onChange={(e) => setMainSport(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {SPORTS_LIST.map((sport) => (
                    <option key={sport} value={sport}>
                      {getSportDisplayName(sport)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Main goal *</span>
                <select
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value as GoalId)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Training level *</span>
                <select
                  value={trainingLevel}
                  onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {TRAINING_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Period *</span>
                {periods.length > 0 ? (
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select period…</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    {sourceWeek.period?.name &&
                      !periods.some((p) => p.name === sourceWeek.period.name) && (
                        <option value={sourceWeek.period.name}>{sourceWeek.period.name}</option>
                      )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. Base, Build, Taper"
                  />
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Language *</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {ARCHIVE_DISPLAY_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Short description *</span>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Describe this weekly plan for other users…"
                />
              </label>

              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noExpiration}
                    onChange={(e) => setNoExpiration(e.target.checked)}
                  />
                  No expiration date (available until you unshare)
                </label>
                {!noExpiration && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-gray-700">Expiration date</span>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      After this date the plan will no longer be available to other users.
                    </span>
                  </label>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSharing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {isSharing ? 'Sharing…' : 'Share with Movesbook users'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
