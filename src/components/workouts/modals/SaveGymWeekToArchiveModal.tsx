'use client';

import React, { useEffect, useState } from 'react';
import { X, Archive, Lock } from 'lucide-react';
import type { PlanGymWeekManualResult } from './PlanGymWeekManualModal';
import {
  GOAL_OPTIONS,
  TRAINING_LEVELS,
  getGoalLabel,
  getPlanGymWeekTrainingLevelLabel,
  type GoalId,
  type TrainingLevel,
} from './PlanGymWeekModal';
import type { GymWeekArchiveSaveMetadata } from '@/types/gymWeekArchive';

type PeriodOption = { id: string; name: string; color?: string };

type Props = {
  isOpen: boolean;
  plan: PlanGymWeekManualResult | null;
  goals?: GoalId[];
  trainingLevel?: TrainingLevel | null;
  periods?: PeriodOption[];
  onClose: () => void;
  onConfirm: (metadata: GymWeekArchiveSaveMetadata) => Promise<void>;
};

type ProfilePreview = {
  authorName: string;
  authorCountry: string;
};

function defaultExpirationDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Lock className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">{value}</div>
    </div>
  );
}

export default function SaveGymWeekToArchiveModal({
  isOpen,
  plan,
  goals = [],
  trainingLevel,
  periods = [],
  onClose,
  onConfirm,
}: Props) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<GoalId>('hypertrophy');
  const [level, setLevel] = useState<TrainingLevel>('intermediate');
  const [periodId, setPeriodId] = useState('');
  const [expirationDate, setExpirationDate] = useState(defaultExpirationDate);
  const [tags, setTags] = useState('');
  const [profile, setProfile] = useState<ProfilePreview>({
    authorName: 'Movesbook user',
    authorCountry: '—',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workoutCount = plan?.daysCount ?? plan?.days?.length ?? 0;
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!isOpen || !plan) return;
    setCreatedAt(new Date().toISOString());
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setCode(`GWP-${workoutCount}D-${stamp}`);
    setTitle(`Gym Week Plan — ${workoutCount} day${workoutCount === 1 ? '' : 's'}`);
    setDescription('');
    setGoal((goals[0] as GoalId) ?? (plan.trainingLevel ? 'hypertrophy' : 'hypertrophy'));
    setLevel((trainingLevel ?? plan.trainingLevel ?? 'intermediate') as TrainingLevel);
    setPeriodId(periods[0]?.id ?? '');
    setExpirationDate(defaultExpirationDate());
    setTags('');
    setError(null);

    void (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user ?? data;
        const name =
          [user.firstName, user.surname].filter(Boolean).join(' ').trim() ||
          user.name?.trim() ||
          user.username?.trim() ||
          'Movesbook user';
        setProfile({
          authorName: name,
          authorCountry: user.country?.trim() || '—',
        });
      } catch {
        /* keep defaults */
      }
    })();
  }, [isOpen, plan, goals, trainingLevel, periods, workoutCount]);

  const selectedPeriod = periods.find((p) => p.id === periodId);

  const handleSubmit = async () => {
    if (!plan) return;
    if (!code.trim()) {
      setError('Code is required.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!periodId) {
      setError('Please select a Period.');
      return;
    }
    if (!expirationDate) {
      setError('Expiring date is required.');
      return;
    }
    const exp = new Date(expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(exp.getTime()) || exp <= today) {
      setError('Expiring date must be a future date.');
      return;
    }

    const metadata: GymWeekArchiveSaveMetadata = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim(),
      goal,
      level,
      periodId,
      periodName: selectedPeriod?.name ?? '',
      expirationDate,
      tags: tags.trim(),
      workoutType: 'NOT aerobic sport',
      duration: 'Weekly plan',
      authorType: 'Movesbook user',
      authorName: profile.authorName,
      authorCountry: profile.authorCountry,
      workoutCount,
      createdAt,
    };

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(metadata);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to archive');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-gym-week-archive-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-gray-700 to-gray-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            <h2 id="save-gym-week-archive-title" className="text-lg font-bold">
              Save Gym Week to Archive
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <p className="text-sm text-gray-600">
            Routines will be saved as <strong>Day 1</strong>, <strong>Day 2</strong>, … without calendar
            assignment. Complete the parameters below, then save to{' '}
            <strong>Archive of Workouts and Weekly Plans</strong>.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Type of workouts" value="NOT aerobic sport" />
            <ReadOnlyField label="Duration" value="Weekly plan" />
            <ReadOnlyField label="Author" value="Movesbook user" />
            <ReadOnlyField label="Author name" value={profile.authorName} />
            <ReadOnlyField label="Country author" value={profile.authorCountry} />
            <ReadOnlyField label="No. of workouts" value={String(workoutCount)} />
            <ReadOnlyField
              label="Date creation"
              value={new Date(createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Parameters to save</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Code *</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. GWP-3D-20260502"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Title *</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Short description of this gym week plan…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Goal *</span>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as GoalId)}
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
                <span className="mb-1 block font-medium text-gray-700">Level *</span>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as TrainingLevel)}
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
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select period…</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Expiring date *</span>
                <input
                  type="date"
                  value={expirationDate}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Tags</span>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="tag1, tag2, tag3"
                />
                <span className="mt-1 block text-xs text-gray-500">Separate multiple tags with a comma</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>Summary:</strong> {getGoalLabel(goal as GoalId)} ·{' '}
            {getPlanGymWeekTrainingLevelLabel(level)} · {workoutCount} workout
            {workoutCount === 1 ? '' : 's'} as Day 1…Day {workoutCount}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
            className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save to Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
