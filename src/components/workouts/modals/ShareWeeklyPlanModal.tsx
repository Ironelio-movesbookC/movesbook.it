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
import type { WeeklyPlanShareSourceType } from '@/lib/globalWeeklyPlanShare';
import { computeWeeklyPlanMetrics } from '@/lib/workoutArchiveMetrics';
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';
import { sharedDayPublicUrl } from '@/lib/siteUrl';
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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: any;
  sourcePlanType: WeeklyPlanShareSourceType;
  periods?: PeriodOption[];
  onArchiveExported?: () => void;
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

function languageName(code: string): string {
  return ARCHIVE_DISPLAY_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

function buildDefaultWeekMessage(
  title: string,
  week: any,
  shareableLink: string,
  forMovesbookUsers?: boolean
): string {
  const workoutCount = getWeekWorkoutCount(week);
  if (forMovesbookUsers) {
    return (
      'Check out my weekly plan "' +
      title +
      '" on Movesbook!\n\n' +
      workoutCount +
      ' workout(s). Other Movesbook users can import it via Workouts → Import → Weekly plans shared by users.\n\n' +
      shareableLink
    );
  }
  return (
    'Check out my weekly plan "' +
    title +
    '" on Movesbook!\n\n' +
    workoutCount +
    ' workout(s).\n\n' +
    shareableLink
  );
}

export default function ShareWeeklyPlanModal({
  isOpen,
  onClose,
  sourceWeek,
  sourcePlanType: _sourcePlanType,
  periods = [],
  onArchiveExported,
  onShared,
}: Props) {
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
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [creatingArchiveWeek, setCreatingArchiveWeek] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const [authorProfile, setAuthorProfile] = useState({
    username: '—',
    countryName: '—',
    countryFlag: '',
  });

  const [publishedLink, setPublishedLink] = useState('');

  const firstDayId = useMemo(() => {
    const days = [...(sourceWeek?.days ?? [])].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return days[0]?.id ?? null;
  }, [sourceWeek]);

  const shareableLink = useMemo(() => {
    if (publishedLink) return publishedLink;
    if (!firstDayId) return '';
    if (typeof window !== 'undefined') {
      return window.location.origin + '/shared/day/' + firstDayId;
    }
    return sharedDayPublicUrl(firstDayId);
  }, [firstDayId, publishedLink]);

  const defaultMessage = useMemo(
    () =>
      sourceWeek && shareableLink
        ? buildDefaultWeekMessage(title || 'Weekly plan', sourceWeek, shareableLink)
        : '',
    [sourceWeek, shareableLink, title]
  );

  const selectedArchiveWeek = useMemo(
    () => archiveWeeks.find((w) => w.id === selectedArchiveWeekId),
    [archiveWeeks, selectedArchiveWeekId]
  );

  const archiveTargetHasContent = selectedArchiveWeek
    ? !isWeekEmpty(selectedArchiveWeek)
    : false;

  const needsArchivePicker =
    selectedPlatform === 'archive' || selectedPlatform === 'archive_shared';
  const needsShareMetadata = selectedPlatform === 'archive_shared';

  useEffect(() => {
    if (!isOpen || !sourceWeek) return;
    const weekNum = sourceWeek.weekNumber ?? '?';
    setTitle('Week ' + weekNum + ' — weekly plan');
    setMainSport(inferSportFromWeek(sourceWeek));
    setMainGoal('hypertrophy');
    setTrainingLevel('intermediate');
    setPeriod(sourceWeek.period?.name ?? periods[0]?.name ?? '');
    setLanguage('en');
    setShortDescription('');
    setExpirationDate(defaultExpirationDate());
    setNoExpiration(true);
    setSelectedPlatform('');
    setRecipient('');
    setMessage('');
    setError(null);
    setPublishedLink('');
    setSelectedArchiveWeekId('');
    setConfirmOverwrite(false);

    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user ?? data;
        const countryFields = resolveAuthorCountryFields(user.country);
        setAuthorProfile({
          username: user.username?.trim() || user.name?.trim() || 'User',
          countryName: countryFields.authorCountryName ?? user.country?.trim() ?? '—',
          countryFlag: countryFields.authorCountryFlag ?? '',
        });
      } catch {
        /* defaults */
      }
    })();
  }, [isOpen, sourceWeek, periods]);

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

  const copyWeekToArchive = async (token: string, sourceWeekId: string, targetWeekId: string) => {
    const response = await fetch('/api/workouts/weeks/copy', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceWeekId, targetWeekId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export week to archive');
    }
  };

  const shareArchiveWeekToGlobal = async (token: string, archiveWeekId: string) => {
    const res = await fetch('/api/workouts/share-to-global', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordType: 'WEEKLY_PLAN',
        sourceId: archiveWeekId,
        sourcePlanType: 'ARCHIVE',
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
      setConfirmOverwrite(false);
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

    if (!sourceWeek?.id) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (selectedPlatform === 'archive' || selectedPlatform === 'archive_shared') {
        if (!selectedArchiveWeekId) {
          setError('Select an archive week to store this plan.');
          setIsProcessing(false);
          return;
        }
        if (archiveTargetHasContent && !confirmOverwrite) {
          setError('Target archive week has content. Confirm overwrite to continue.');
          setIsProcessing(false);
          return;
        }
        if (needsShareMetadata && !validateShareMetadata()) {
          setIsProcessing(false);
          return;
        }

        await copyWeekToArchive(token, sourceWeek.id, selectedArchiveWeekId);

        if (selectedPlatform === 'archive_shared') {
          const data = await shareArchiveWeekToGlobal(token, selectedArchiveWeekId);
          const linkMsg = buildDefaultWeekMessage(
            title,
            sourceWeek,
            shareableLink || 'https://movesbook.com',
            true
          );
          setMessage(linkMsg);
          onShared?.();
          alert(
            data.message ||
              'Weekly plan saved to your Archive and shared with other Movesbook users.'
          );
        } else {
          onArchiveExported?.();
          alert('Weekly plan exported to your Archive of workouts & weekly plans.');
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
            subject: 'Weekly plan: ' + title + ' — Movesbook',
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

  if (!isOpen || !sourceWeek) return null;

  const langLabel = languageName(language);
  const createdLabel = sourceWeek.createdAt
    ? new Date(sourceWeek.createdAt).toLocaleDateString(undefined, {
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

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Share2 size={20} />
            <h2 className="text-lg font-bold">Share Weekly Plan</h2>
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
              placeholder="Name of the weekly plan"
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
                value={shareableLink || 'Link available after export (uses week overview)'}
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
              Recipients will see the plan in Overview mode (read-only). Movesbook users can also
              import shared plans from the global catalog.
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

          {needsArchivePicker && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">Archive week (weekly plans)</label>
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
                <select
                  value={selectedArchiveWeekId}
                  onChange={(e) => {
                    setSelectedArchiveWeekId(e.target.value);
                    setConfirmOverwrite(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Choose archive week…</option>
                  {archiveWeeks.map((week, idx) => (
                    <option key={week.id} value={week.id}>
                      Archive Week {week.weekNumber ?? idx + 1}
                      {isWeekEmpty(week) ? ' (empty)' : ' (has workouts)'}
                    </option>
                  ))}
                </select>
              )}
              {archiveTargetHasContent && (
                <label className="flex items-start gap-2 text-sm text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmOverwrite}
                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                    className="mt-0.5"
                  />
                  Replace existing workouts in the selected archive week
                </label>
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
                {periods.length > 0 ? (
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5"
                  >
                    <option value="">Select period…</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
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
