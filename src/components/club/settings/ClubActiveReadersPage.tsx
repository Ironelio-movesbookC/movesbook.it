'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Loader2
} from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import ClubCardReaderAssignActivityModal from '@/app/club/dashboard/components/ClubCardReaderAssignActivityModal';
import type { CardReaderListItem } from '@/types/clubCardReaders';

function readerLabel(row: CardReaderListItem): string {
  const desc = row.description || row.readerName || `Reader ${row.id}`;
  return [desc, row.controlMode, row.readerType, row.readerPort ? `on ${row.readerPort}` : '']
    .filter(Boolean)
    .join(' - ');
}

export default function ClubActiveReadersPage() {
  const [items, setItems] = useState<CardReaderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/card-readers?scope=active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load active readers.');
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load active readers.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requireSelection = () => {
    if (!selectedId) {
      window.alert('Please select a reader.');
      return false;
    }
    return true;
  };

  const resetActivities = async () => {
    if (!requireSelection()) return;
    const confirmed = window.confirm('Do you want to reset activities for the selected reader?');
    if (!confirmed) return;

    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/club/settings/card-readers/${selectedId}/activities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ activityIds: [] })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Reset failed.');
      }
      setSuccessMessage('Activities reset successfully.');
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  const btnClass =
    'inline-flex h-9 items-center rounded-md border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="p-4 lg:p-6">
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <ClubSettingsTypologyTabs />

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-950">
            Setting typologies of subscription to the club
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assignment activities to be controlled by the readers
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Active readers (access control modes 1 and 2, enabled only). To add or edit readers, use{' '}
            <Link href="/club/dashboard?panel=identification-devices" className="font-semibold text-blue-700 underline">
              Identification devices
            </Link>{' '}
            in the club dashboard.
          </p>
        </div>

        {successMessage && (
          <div className="mx-4 mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col gap-4 p-4 lg:flex-row">
          <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col lg:shrink-0">
            <button
              type="button"
              className={btnClass}
              onClick={() => {
                if (requireSelection()) setAssignOpen(true);
              }}
            >
              Assign Activity
            </button>
            <button
              type="button"
              className={btnClass}
              onClick={() => {
                if (!window.confirm('Do you want to remove selection?')) return;
                setSelectedId(null);
              }}
            >
              Remove Selection
            </button>
            <button
              type="button"
              className={btnClass}
              disabled={!selectedId || resetting}
              onClick={() => void resetActivities()}
            >
              {resetting ? 'Resetting…' : 'Reset all'}
            </button>
          </div>

          <div className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Active Readers
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading readers…
              </div>
            ) : error ? (
              <p className="px-4 py-12 text-center text-sm text-red-600">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-gray-500">
                No active readers found. Enable readers with control modes suitable for activity assignment.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((row) => {
                  const isSelected = selectedId === row.id;
                  const isExpanded = expandedIds.has(row.id);
                  const activities = row.activities;

                  return (
                    <li key={row.id}>
                      <div
                        className={`flex items-start gap-2 px-3 py-2 ${
                          isSelected ? 'bg-yellow-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="active-reader"
                          checked={isSelected}
                          onChange={() => setSelectedId(row.id)}
                          className="mt-1.5 h-4 w-4 accent-gray-900"
                          aria-label={`Select ${readerLabel(row)}`}
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpanded(row.id)}
                          className="mt-1 text-gray-500"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <FolderOpen className="mt-1 h-4 w-4 shrink-0 text-gray-600" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(row.id);
                            if (activities.length > 0) toggleExpanded(row.id);
                          }}
                          className={`flex-1 text-left text-sm ${
                            isSelected ? 'font-semibold text-gray-950' : 'text-gray-800'
                          }`}
                        >
                          {readerLabel(row)}
                        </button>
                      </div>
                      {isExpanded && (
                        <ul className="border-t border-gray-100 bg-gray-50 py-1 pl-14 pr-3">
                          {activities.length === 0 ? (
                            <li className="py-1 text-xs text-gray-500">No activities assigned.</li>
                          ) : (
                            activities.map((activity) => (
                              <li
                                key={activity.id}
                                className="flex items-center gap-2 py-1 text-sm text-gray-700"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                {activity.label}
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <ClubCardReaderAssignActivityModal
        isOpen={assignOpen}
        readerId={selectedId}
        clubId={null}
        onClose={() => setAssignOpen(false)}
        onSaved={() => {
          setSuccessMessage('Activities updated successfully.');
          void load();
        }}
      />
    </div>
  );
}
