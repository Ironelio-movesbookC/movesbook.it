'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, Users, ChevronLeft } from 'lucide-react';
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
import {
  computeWorkoutArchiveMetrics,
  formatArchiveDuration,
} from '@/lib/workoutArchiveMetrics';
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';
import { saveWorkoutToFavorites } from '@/lib/saveFavoriteWorkout';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import type { WorkoutSaveMetaInput } from '@/lib/workoutSaveMeta';

type PeriodOption = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  sourceWorkout: any;
  sourceDay: any;
  mode: 'favorite' | 'archive';
  activeSubSection?: 'A' | 'B' | 'C';
  periods?: PeriodOption[];
  onSaved?: () => void;
};

function defaultExpirationDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function inferSportFromWorkout(workout: any): string {
  if (workout?.mainSport) return workout.mainSport;
  const sport = workout?.sports?.[0]?.sport ?? workout?.moveframes?.[0]?.sport;
  return sport || SPORTS_LIST[0] || 'running';
}

function inferGoalFromWorkout(workout: any): GoalId {
  const raw = (workout?.mainGoal ?? '').toLowerCase();
  const match = GOAL_OPTIONS.find(
    (o) => o.label.toLowerCase() === raw || o.value === raw
  );
  return (match?.value as GoalId) ?? 'hypertrophy';
}

function inferTrainingLevelFromWorkout(workout: any): TrainingLevel {
  const raw = (workout?.intensity ?? workout?.trainingLevel ?? '').toLowerCase();
  const match = TRAINING_LEVELS.find(
    (l) => l.label.toLowerCase() === raw || l.value === raw
  );
  return (match?.value as TrainingLevel) ?? 'intermediate';
}

export default function SaveTemplateWorkoutMetadataModal({
  isOpen,
  onClose,
  onBack,
  sourceWorkout,
  sourceDay,
  mode,
  activeSubSection = 'A',
  periods = [],
  onSaved,
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
  const [shareWithUsers, setShareWithUsers] = useState(true);
  const [archiveWeeks, setArchiveWeeks] = useState<any[]>([]);
  const [selectedArchiveWeekId, setSelectedArchiveWeekId] = useState('');
  const [selectedArchiveDayId, setSelectedArchiveDayId] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [creatingArchiveWeek, setCreatingArchiveWeek] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorProfile, setAuthorProfile] = useState<{
    username: string;
    avatarUrl: string | null;
    countryName: string;
    countryFlag: string;
  }>({ username: '—', avatarUrl: null, countryName: '—', countryFlag: '' });

  const workoutMetrics = useMemo(
    () => computeWorkoutArchiveMetrics(sourceWorkout ?? {}),
    [sourceWorkout]
  );

  const moveframeCount = sourceWorkout?.moveframes?.length ?? 0;
  const workoutCreatedAt = sourceWorkout?.createdAt ? new Date(sourceWorkout.createdAt) : null;
  const [savingDatePreview, setSavingDatePreview] = useState(() => new Date());

  const selectedArchiveWeek = useMemo(
    () => archiveWeeks.find((w) => w.id === selectedArchiveWeekId),
    [archiveWeeks, selectedArchiveWeekId]
  );

  const archiveDays = useMemo(() => {
    if (!selectedArchiveWeek?.days?.length) return [];
    return [...selectedArchiveWeek.days].sort(
      (a: any, b: any) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
    );
  }, [selectedArchiveWeek]);

  const selectedArchiveDay = archiveDays.find((d: any) => d.id === selectedArchiveDayId);
  const archiveDayFull = selectedArchiveDay ? getDayWorkoutCount(selectedArchiveDay) >= 3 : false;

  useEffect(() => {
    if (!isOpen || !sourceWorkout) return;
    setSavingDatePreview(new Date());
    const defaultTitle =
      sourceWorkout.name?.trim() || `Workout #${sourceWorkout.sessionNumber ?? '?'}`;
    setTitle(defaultTitle);
    setMainSport(inferSportFromWorkout(sourceWorkout));
    setMainGoal(inferGoalFromWorkout(sourceWorkout));
    setTrainingLevel(inferTrainingLevelFromWorkout(sourceWorkout));
    setPeriod(sourceDay?.period?.name ?? periods[0]?.name ?? '');
    setLanguage('en');
    setShortDescription('');
    setExpirationDate(defaultExpirationDate());
    setNoExpiration(true);
    setShareWithUsers(true);
    setSelectedArchiveWeekId('');
    setSelectedArchiveDayId('');
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
  }, [isOpen, sourceWorkout, sourceDay, periods]);

  useEffect(() => {
    if (!isOpen || mode !== 'archive' || shareWithUsers) return;
    setArchiveLoading(true);
    void (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setArchiveWeeks([]);
          return;
        }
        setArchiveWeeks(await fetchPlanWeeks(token, 'ARCHIVE'));
      } catch {
        setArchiveWeeks([]);
      } finally {
        setArchiveLoading(false);
      }
    })();
  }, [isOpen, mode, shareWithUsers]);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Title is required.');
      return false;
    }
    if (!mainSport.trim()) {
      setError('Main sport is required.');
      return false;
    }
    if (!period.trim()) {
      setError('Period is required.');
      return false;
    }
    if (!shortDescription.trim()) {
      setError('Short description is required.');
      return false;
    }
    if (!noExpiration && !expirationDate) {
      setError('Select an expiration date or choose no expiration.');
      return false;
    }
    if (mode === 'archive' && !shareWithUsers) {
      if (!selectedArchiveDayId) {
        setError('Select an archive week and day to store this workout.');
        return false;
      }
      if (archiveDayFull) {
        setError('Selected archive day already has 3 workouts (maximum).');
        return false;
      }
    }
    return true;
  };

  const buildSaveMetaInput = (): WorkoutSaveMetaInput => ({
    title: title.trim(),
    mainSport: mainSport.trim(),
    mainGoal: getGoalLabel(mainGoal),
    trainingLevel: getPlanGymWeekTrainingLevelLabel(trainingLevel),
    period: period.trim(),
    language,
    shortDescription: shortDescription.trim(),
    expirationDate: noExpiration ? null : expirationDate,
  });

  const handleCreateArchiveWeek = async () => {
    setCreatingArchiveWeek(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/api/workouts/archive/weeks', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create archive week');
      }
      const data = await response.json();
      const newWeek = data.week;
      setArchiveWeeks((prev) => [...prev, newWeek].sort((a, b) => a.weekNumber - b.weekNumber));
      setSelectedArchiveWeekId(newWeek.id);
      setSelectedArchiveDayId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create archive week');
    } finally {
      setCreatingArchiveWeek(false);
    }
  };

  const copyWorkoutToArchiveDay = async (
    token: string,
    sourceWorkoutId: string,
    targetDayId: string
  ): Promise<string> => {
    const targetDay = archiveDays.find((d: any) => d.id === targetDayId);
    const existing = targetDay?.workouts?.length ?? 0;
    const response = await fetch('/api/workouts/sessions/copy', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceWorkoutId,
        targetDayId,
        sessionNumber: existing + 1,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export workout to archive');
    }
    const data = await response.json();
    return data.workout?.id as string;
  };

  const handleSave = async () => {
    if (!sourceWorkout?.id) return;
    if (!validateForm()) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saveMeta = buildSaveMetaInput();
      const weekNumber = sourceDay?.weekNumber;

      if (mode === 'favorite') {
        const result = await saveWorkoutToFavorites(sourceWorkout, {
          name: saveMeta.title,
          description: saveMeta.shortDescription,
          saveMeta,
          sourceTemplate: activeSubSection,
          sourceWeekNumber: weekNumber,
        });
        if (!result.ok) {
          throw new Error(result.error || 'Failed to save to favourites');
        }
        alert(result.message || 'Workout saved to Favourites.');
        onSaved?.();
        onClose();
        return;
      }

      if (shareWithUsers) {
        const res = await fetch('/api/workouts/share-to-global', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recordType: 'WORKOUT',
            sourceId: sourceWorkout.id,
            title: saveMeta.title,
            mainSport: saveMeta.mainSport,
            mainGoal: saveMeta.mainGoal,
            trainingLevel: saveMeta.trainingLevel,
            period: saveMeta.period,
            originalLanguages: saveMeta.language,
            shortDescription: saveMeta.shortDescription,
            expirationDate: noExpiration ? undefined : expirationDate,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to share workout');
        }
        alert(
          data.message ||
            'Your workout is now in the General Archive of shared workouts & weekly plans.'
        );
        onSaved?.();
        onClose();
        return;
      }

      const copiedWorkoutId = await copyWorkoutToArchiveDay(
        token,
        sourceWorkout.id,
        selectedArchiveDayId
      );

      const fullSaveMeta = {
        ...saveMeta,
        authorUsername: authorProfile.username,
        authorAvatarUrl: authorProfile.avatarUrl,
        authorCountryName: authorProfile.countryName,
        authorCountryFlag: authorProfile.countryFlag,
        workoutCount: 1,
        moveframeCount,
        totalMeters: workoutMetrics.totalMeters,
        totalTimeSeconds: workoutMetrics.totalTimeSeconds,
        totalSeries: workoutMetrics.totalSeries,
        createdAt: workoutCreatedAt?.toISOString() ?? new Date().toISOString(),
        savedAt: new Date().toISOString(),
        sharedAt: null,
        sourceTemplate: activeSubSection,
        sourceWeekNumber: weekNumber,
      };

      await fetch(`/api/workouts/sessions/${copiedWorkoutId}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: JSON.stringify({ _saveMeta: fullSaveMeta }),
        }),
      });

      alert('Workout saved to your Archive of workouts & weekly plans (not shared).');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !sourceWorkout) return null;

  const workoutLabel =
    sourceWorkout.name?.trim() || `Workout #${sourceWorkout.sessionNumber ?? '?'}`;
  const headerTitle = mode === 'favorite' ? 'Save to Favourites' : 'Save to General Archive';
  const saveButtonLabel =
    mode === 'favorite'
      ? isSaving
        ? 'Saving…'
        : 'Save to Favourites'
      : shareWithUsers
        ? isSaving
          ? 'Sharing…'
          : 'Save & share'
        : isSaving
          ? 'Saving…'
          : 'Save to Archive';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 hover:bg-white/20 rounded-full shrink-0"
                  disabled={isSaving}
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <Download className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold truncate">{headerTitle}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full shrink-0"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-900">
              <strong>{workoutLabel}</strong>
              {sourceDay?.weekNumber != null ? ` — Weekly Plan ${activeSubSection}, Week ${sourceDay.weekNumber}` : null}
              {mode === 'favorite'
                ? ' will be saved to your favourite workouts with the details below.'
                : shareWithUsers
                  ? ' will be added to the General Archive and shared with other Movesbook users.'
                  : ' will be copied to your personal Archive (not shared).'}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Automatically added when saving
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
                  <span className="font-semibold text-gray-900">1</span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total meters</span>
                  <span className="font-semibold text-gray-900">
                    {workoutMetrics.totalMeters > 0 ? workoutMetrics.totalMeters + ' m' : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total time</span>
                  <span className="font-semibold text-gray-900">
                    {formatArchiveDuration(workoutMetrics.totalTimeSeconds)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Total series</span>
                  <span className="font-semibold text-gray-900">
                    {workoutMetrics.totalSeries > 0 ? workoutMetrics.totalSeries : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">Date of creation</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {workoutCreatedAt
                      ? workoutCreatedAt.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 rounded bg-white px-3 py-2 border border-gray-100">
                  <span className="text-gray-500">
                    {mode === 'archive' && shareWithUsers ? 'Date of sharing' : 'Date of saving'}
                  </span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {savingDatePreview.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {mode === 'archive' && (
              <label className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  checked={shareWithUsers}
                  onChange={(e) => {
                    setShareWithUsers(e.target.checked);
                    setError(null);
                  }}
                />
                Share with other Movesbook users (General Archive — shared)
              </label>
            )}

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
                    {sourceDay?.period?.name &&
                      !periods.some((p) => p.name === sourceDay.period.name) && (
                        <option value={sourceDay.period.name}>{sourceDay.period.name}</option>
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
                  placeholder="Describe this workout…"
                />
              </label>

              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noExpiration}
                    onChange={(e) => setNoExpiration(e.target.checked)}
                  />
                  No expiration date
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
                  </label>
                )}
              </div>
            </div>

            {mode === 'archive' && !shareWithUsers && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Select archive week &amp; day:</p>
                  <button
                    type="button"
                    onClick={() => void handleCreateArchiveWeek()}
                    disabled={creatingArchiveWeek}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {creatingArchiveWeek ? 'Creating…' : '+ New archive week'}
                  </button>
                </div>
                {archiveLoading ? (
                  <p className="text-center py-4 text-gray-500 text-sm">Loading archive…</p>
                ) : archiveWeeks.length === 0 ? (
                  <p className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-3">
                    No archive weeks yet. Create one to store this workout privately.
                  </p>
                ) : (
                  <>
                    <select
                      value={selectedArchiveWeekId}
                      onChange={(e) => {
                        setSelectedArchiveWeekId(e.target.value);
                        setSelectedArchiveDayId('');
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select archive week…</option>
                      {archiveWeeks.map((week, idx) => (
                        <option key={week.id} value={week.id}>
                          Archive Week {week.weekNumber ?? idx + 1}
                        </option>
                      ))}
                    </select>
                    {selectedArchiveWeekId && archiveDays.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {archiveDays.map((day: any) => {
                          const count = getDayWorkoutCount(day);
                          const full = count >= 3;
                          return (
                            <label
                              key={day.id}
                              className={
                                'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' +
                                (selectedArchiveDayId === day.id
                                  ? 'border-purple-500 bg-purple-50'
                                  : full
                                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-gray-300')
                              }
                            >
                              <input
                                type="radio"
                                name="archiveDay"
                                value={day.id}
                                checked={selectedArchiveDayId === day.id}
                                disabled={full}
                                onChange={() => setSelectedArchiveDayId(day.id)}
                              />
                              <span className="text-sm">
                                {templateDaySlotLabel(day)}
                                <span className="text-gray-500 ml-2">
                                  ({count}/3 workout{count === 1 ? '' : 's'})
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

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
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {saveButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
