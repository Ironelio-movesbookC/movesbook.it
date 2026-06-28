'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Facebook,
  Download,
  Globe,
} from 'lucide-react';
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
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import { sharedWorkoutPublicUrl } from '@/lib/siteUrl';
import { isValidShareEmail } from '@/lib/shareEmail';
import {
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  ensureShareLinkInMessage,
  FACEBOOK_SHARE_NOTICE,
  openExternalShareUrl,
  shareViaFacebook,
} from '@/utils/socialShareUrls';

type SharePlatform =
  | 'archive'
  | 'archive_shared'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'email'
  | '';

type PeriodOption = { id: string; name: string };

interface ShareWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  day: any;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  periods?: PeriodOption[];
  onArchiveExported?: () => void;
  onGlobalShared?: () => void;
}

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

function languageName(code: string): string {
  return ARCHIVE_DISPLAY_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export default function ShareWorkoutModal({
  isOpen,
  onClose,
  workout,
  day,
  activeSection,
  periods = [],
  onArchiveExported,
  onGlobalShared,
}: ShareWorkoutModalProps) {
  const isArchiveSource = activeSection === 'D';

  const [selectedPlatform, setSelectedPlatform] = useState<SharePlatform>('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [mainSport, setMainSport] = useState('');
  const [mainGoal, setMainGoal] = useState<GoalId>('hypertrophy');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('intermediate');
  const [period, setPeriod] = useState('');
  const [language, setLanguage] = useState('en');
  const [shortDescription, setShortDescription] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [noExpiration, setNoExpiration] = useState(true);

  const [archiveWeeks, setArchiveWeeks] = useState<any[]>([]);
  const [selectedArchiveWeekId, setSelectedArchiveWeekId] = useState('');
  const [selectedArchiveDayId, setSelectedArchiveDayId] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [creatingArchiveWeek, setCreatingArchiveWeek] = useState(false);

  const [authorProfile, setAuthorProfile] = useState({
    username: '—',
    countryName: '—',
    countryFlag: '',
  });

  const [loadedPeriods, setLoadedPeriods] = useState<PeriodOption[]>(periods);

  const shareableLink = useMemo(() => {
    if (!workout?.id) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/shared/workout/${workout.id}`;
    }
    return sharedWorkoutPublicUrl(workout.id);
  }, [workout?.id]);

  const workoutTitleDefault =
    workout?.name?.trim() || `Workout #${workout?.sessionNumber ?? '?'}`;

  const defaultMessage = useMemo(
    () =>
      shareableLink
        ? `Check out this workout: ${title || workoutTitleDefault}\n\n${shareableLink}`
        : '',
    [shareableLink, title, workoutTitleDefault]
  );

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

  const needsArchivePicker =
    selectedPlatform === 'archive' ||
    (selectedPlatform === 'archive_shared' && !isArchiveSource);
  const needsShareMetadata = selectedPlatform === 'archive_shared';

  useEffect(() => {
    setLoadedPeriods(periods);
  }, [periods]);

  useEffect(() => {
    if (!isOpen || !workout) return;
    setTitle(workoutTitleDefault);
    setMainSport(inferSportFromWorkout(workout));
    setMainGoal(inferGoalFromWorkout(workout));
    setTrainingLevel(inferTrainingLevelFromWorkout(workout));
    setPeriod(day?.period?.name ?? periods[0]?.name ?? '');
    setLanguage('en');
    setShortDescription('');
    setExpirationDate(defaultExpirationDate());
    setNoExpiration(true);
    setSelectedPlatform('');
    setRecipient('');
    setMessage('');
    setError(null);
    setSelectedArchiveWeekId('');
    setSelectedArchiveDayId('');

    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const profileRes = await fetch('/api/user/profile', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          const user = data.user ?? data;
          const countryFields = resolveAuthorCountryFields(user.country);
          setAuthorProfile({
            username: user.username?.trim() || user.name?.trim() || 'User',
            countryName: countryFields.authorCountryName ?? user.country?.trim() ?? '—',
            countryFlag: countryFields.authorCountryFlag ?? '',
          });
        }
      } catch {
        /* defaults */
      }
    })();
  }, [isOpen, workout, day, workoutTitleDefault, periods]);

  useEffect(() => {
    if (!isOpen || periods.length > 0 || loadedPeriods.length > 0) return;
    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const periodsRes = await fetch('/api/workouts/periods', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (periodsRes.ok) {
          const data = await periodsRes.json();
          setLoadedPeriods(data.periods ?? []);
        }
      } catch {
        /* defaults */
      }
    })();
  }, [isOpen, periods.length, loadedPeriods.length]);

  useEffect(() => {
    if (!isOpen || !needsArchivePicker) return;
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
  }, [isOpen, needsArchivePicker]);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultMessage) setMessage(defaultMessage);
  }, [isOpen, defaultMessage, selectedPlatform]);

  const validateShareMetadata = (): boolean => {
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
    return true;
  };

  const copyWorkoutToArchiveDay = async (
    token: string,
    sourceWorkoutId: string,
    targetDayId: string
  ): Promise<string> => {
    const targetDay = archiveDays.find((d: any) => d.id === targetDayId);
    const existing = targetDay?.workouts?.length ?? 0;
    if (existing >= 3) {
      throw new Error('Cannot export: archive day already has 3 workouts (maximum).');
    }
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

  const shareWorkoutToGlobal = async (token: string, sourceWorkoutId: string) => {
    const res = await fetch('/api/workouts/share-to-global', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordType: 'WORKOUT',
        sourceId: sourceWorkoutId,
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
      throw new Error(data.error || 'Failed to share with Movesbook users');
    }
    return data;
  };

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

  const handlePrimaryAction = async () => {
    if (!selectedPlatform) {
      alert('Please select a platform');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first.');
      return;
    }

    if (!workout?.id) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (selectedPlatform === 'archive' || selectedPlatform === 'archive_shared') {
        if (needsArchivePicker && !selectedArchiveDayId) {
          setError('Select an archive week and day to store this workout.');
          setIsProcessing(false);
          return;
        }
        if (needsShareMetadata && !validateShareMetadata()) {
          setIsProcessing(false);
          return;
        }

        let workoutIdForShare = workout.id;

        if (needsArchivePicker && selectedArchiveDayId) {
          workoutIdForShare = await copyWorkoutToArchiveDay(
            token,
            workout.id,
            selectedArchiveDayId
          );
        }

        if (selectedPlatform === 'archive_shared') {
          const data = await shareWorkoutToGlobal(token, workoutIdForShare);
          onGlobalShared?.();
          onArchiveExported?.();
          alert(
            data.message ||
              'Workout saved to your Archive and shared with other Movesbook users via the Global archive.'
          );
        } else {
          onArchiveExported?.();
          alert('Workout exported to your Archive of workouts & weekly plans.');
        }
        onClose();
        return;
      }

      if (!shareableLink) {
        alert('Share link is not ready. Please try again.');
        return;
      }

      const messageText = ensureShareLinkInMessage(
        message.trim() || defaultMessage,
        shareableLink
      );

      if (selectedPlatform === 'email') {
        if (!isValidShareEmail(recipient.trim())) {
          setError('Enter a valid email address.');
          setIsProcessing(false);
          return;
        }
        const res = await fetch('/api/workouts/share/email', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipient.trim(),
            subject: `Workout: ${title || workoutTitleDefault} — Movesbook`,
            message: messageText,
            shareLink: shareableLink,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to send email');
        }
        alert('Email sent successfully.');
        onClose();
        return;
      }

      let shareUrl = '';
      switch (selectedPlatform) {
        case 'whatsapp':
          shareUrl = buildWhatsAppShareUrl(recipient, messageText);
          break;
        case 'telegram': {
          const telegram = buildTelegramShareUrl(recipient, shareableLink, messageText);
          shareUrl = telegram.url;
          if (telegram.notice) alert(telegram.notice);
          break;
        }
        case 'facebook': {
          const fb = await shareViaFacebook(shareableLink, messageText);
          if (fb.copiedToClipboard) alert(FACEBOOK_SHARE_NOTICE);
          else alert(FACEBOOK_SHARE_NOTICE);
          onClose();
          return;
        }
        default:
          break;
      }

      if (shareUrl) openExternalShareUrl(shareUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  if (!isOpen || !workout) return null;

  const langLabel = languageName(language);
  const createdLabel = workout.createdAt
    ? new Date(workout.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString();
  const availableUntilLabel = noExpiration
    ? 'No expiration'
    : expirationDate
      ? new Date(expirationDate).toLocaleDateString()
      : '—';

  const primaryButtonLabel =
    selectedPlatform === 'archive'
      ? isProcessing
        ? 'Exporting…'
        : 'Export to my Archive'
      : selectedPlatform === 'archive_shared'
        ? isProcessing
          ? 'Exporting & sharing…'
          : 'Export & put shared'
        : isProcessing
          ? 'Sharing…'
          : 'Share via Platform';

  const periodOptions = loadedPeriods.length > 0 ? loadedPeriods : periods;

  return (
    <div className="fixed inset-0 z-[10000000] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Share2 size={20} />
            <h2 className="text-lg font-bold">Share Workout</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-gray-900 border-b border-blue-200 pb-1 focus:outline-none focus:border-blue-400"
              placeholder="Name of the workout"
            />
            <p className="text-xs text-blue-800">
              {langLabel} — {authorProfile.countryName}
              {authorProfile.countryFlag ? ' ' + authorProfile.countryFlag : ''} —{' '}
              {authorProfile.username} — Created {createdLabel}
              {' — Available until '}
              {availableUntilLabel}
            </p>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="w-full text-xs text-red-700 bg-transparent border border-red-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-300"
              placeholder="Short description here"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 text-sm"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!shareableLink}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recipients will see the workout in Overview mode (read-only). Movesbook users can also
              import shared workouts from the global catalog.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlatform('archive')}
                className={
                  'flex items-center gap-2 px-3 py-3 border-2 rounded-lg text-sm font-medium transition-all ' +
                  (selectedPlatform === 'archive'
                    ? 'border-slate-600 bg-slate-50'
                    : 'border-gray-300 hover:border-gray-400')
                }
              >
                <Download size={18} className="text-slate-700 shrink-0" />
                <span className="text-left leading-tight">Export in my archive</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform('archive_shared')}
                className={
                  'flex items-center gap-2 px-3 py-3 border-2 rounded-lg text-sm font-medium transition-all ' +
                  (selectedPlatform === 'archive_shared'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 hover:border-gray-400')
                }
              >
                <Download size={18} className="text-indigo-700 shrink-0" />
                <Globe size={16} className="text-indigo-600 shrink-0" />
                <span className="text-left leading-tight">Export &amp; put shared</span>
              </button>
              {(
                [
                  ['whatsapp', MessageCircle, 'text-green-600', 'border-green-500', 'bg-green-50'],
                  ['telegram', Send, 'text-blue-600', 'border-blue-500', 'bg-blue-50'],
                  ['facebook', Facebook, 'text-blue-700', 'border-blue-700', 'bg-blue-50'],
                  ['email', Mail, 'text-red-600', 'border-red-500', 'bg-red-50'],
                ] as const
              ).map(([platform, Icon, iconCls, activeBorder, activeBg]) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={
                    'flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ' +
                    (selectedPlatform === platform
                      ? activeBorder + ' ' + activeBg
                      : 'border-gray-300 hover:border-gray-400')
                  }
                >
                  <Icon size={20} className={iconCls} />
                  <span className="font-medium text-sm capitalize">{platform}</span>
                </button>
              ))}
            </div>
          </div>

          {needsShareMetadata && isArchiveSource && (
            <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              This workout is already in your Archive. It will be shared with the title above in
              the Global archive of shared workouts &amp; weekly plans.
            </p>
          )}

          {needsArchivePicker && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {isArchiveSource ? 'Archive day (copy to)' : 'Archive week & day'}
                </label>
                <button
                  type="button"
                  onClick={() => void handleCreateArchiveWeek()}
                  disabled={creatingArchiveWeek}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {creatingArchiveWeek ? 'Creating…' : '+ New archive week'}
                </button>
              </div>
              {archiveLoading ? (
                <p className="text-sm text-gray-500">Loading archive…</p>
              ) : (
                <>
                  <select
                    value={selectedArchiveWeekId}
                    onChange={(e) => {
                      setSelectedArchiveWeekId(e.target.value);
                      setSelectedArchiveDayId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Choose archive week…</option>
                    {archiveWeeks.map((week, idx) => (
                      <option key={week.id} value={week.id}>
                        Archive Week {week.weekNumber ?? idx + 1}
                      </option>
                    ))}
                  </select>
                  {selectedArchiveWeekId && archiveDays.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {archiveDays.map((archiveDay: any) => {
                        const workoutCount = archiveDay.workouts?.length ?? 0;
                        const full = workoutCount >= 3;
                        return (
                          <button
                            key={archiveDay.id}
                            type="button"
                            disabled={full}
                            onClick={() => setSelectedArchiveDayId(archiveDay.id)}
                            className={`px-3 py-2 text-sm rounded border transition-colors ${
                              selectedArchiveDayId === archiveDay.id
                                ? 'bg-gray-800 text-white border-gray-900'
                                : full
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {archiveDay.date
                              ? new Date(archiveDay.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : templateDaySlotLabel(archiveDay)}
                            <span className="block text-xs opacity-80">
                              {workoutCount}/3 workout{workoutCount === 1 ? '' : 's'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {needsShareMetadata && (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700">Main sport *</span>
                <select
                  value={mainSport}
                  onChange={(e) => setMainSport(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                >
                  {SPORTS_LIST.map((sport) => (
                    <option key={sport} value={sport}>
                      {getSportDisplayName(sport)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700">Language *</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                >
                  {ARCHIVE_DISPLAY_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700">Goal *</span>
                <select
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value as GoalId)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                >
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700">Level *</span>
                <select
                  value={trainingLevel}
                  onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                >
                  {TRAINING_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Period *</span>
                {periodOptions.length > 0 ? (
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                  >
                    <option value="">Select period…</option>
                    {periodOptions.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    {day?.period?.name &&
                      !periodOptions.some((p) => p.name === day.period.name) && (
                        <option value={day.period.name}>{day.period.name}</option>
                      )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                  />
                )}
              </label>
              <label className="flex items-center gap-2 sm:col-span-2 text-xs">
                <input
                  type="checkbox"
                  checked={noExpiration}
                  onChange={(e) => setNoExpiration(e.target.checked)}
                />
                No expiration (shared until you unshare)
              </label>
              {!noExpiration && (
                <label className="block sm:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Available until</span>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                  />
                </label>
              )}
            </div>
          )}

          {selectedPlatform &&
            selectedPlatform !== 'archive' &&
            selectedPlatform !== 'archive_shared' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient{' '}
                    {selectedPlatform === 'email' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={
                      selectedPlatform === 'whatsapp'
                        ? 'Phone number (optional)'
                        : selectedPlatform === 'telegram'
                          ? '@username (optional)'
                          : selectedPlatform === 'email'
                            ? 'name@example.com'
                            : 'Not required for Facebook'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    disabled={selectedPlatform === 'facebook'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </>
            )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={
              isProcessing ||
              !selectedPlatform ||
              (selectedPlatform === 'email' && !recipient.trim())
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {primaryButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
