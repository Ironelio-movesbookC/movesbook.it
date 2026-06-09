'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import type { ActivityOverviewArea } from '@/lib/clubActivityOverview';

export default function ClubActivityOverviewPage() {
  const [items, setItems] = useState<ActivityOverviewArea[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/club/settings/activity-overview', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load overview.');
        }
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load overview.');
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6">
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <ClubSettingsTypologyTabs />

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-950">
            Setting typologies of subscription to the club
          </h1>
          <p className="mt-1 text-sm text-gray-500">Overview about the settings to the readers</p>
        </div>

        <div className="p-4">
          <div className="mb-3 rounded-md border border-blue-200 bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            Typologies of subscription
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading overview…
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No areas or typologies configured yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {items.map((area) => {
                const isExpanded = expandedIds.has(area.id);
                const readerSummary = area.readerNames.length > 0
                  ? area.readerNames.join(', ')
                  : '—';

                return (
                  <li key={area.id}>
                    <div className="flex items-start gap-2 bg-gray-50 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(area.id)}
                        className="mt-0.5 text-gray-500"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(area.id)}
                        className="flex-1 text-left text-sm font-semibold text-gray-900"
                      >
                        {area.name}
                        <span className="ml-2 font-normal text-gray-600">→ {readerSummary}</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <ul className="border-t border-gray-100 bg-white py-1 pl-12 pr-3">
                        {area.subscriptions.length === 0 ? (
                          <li className="py-2 text-xs text-gray-500">No list prices for this area.</li>
                        ) : (
                          area.subscriptions.map((subscription) => (
                            <li
                              key={subscription.id}
                              className="flex items-center gap-2 py-1.5 text-sm text-gray-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                              {subscription.subscriptionName}
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
      </section>
    </div>
  );
}
