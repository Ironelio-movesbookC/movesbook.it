'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createInitialBachecaLabels,
  normalizeBachecaLabel,
  type BachecaLabel,
} from '@/lib/clubBachecaLabels';

const API_PATH = '/api/club/website/bacheca';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useClubBachecaLabels(clubId: string | undefined) {
  const [labels, setLabels] = useState<BachecaLabel[]>(() => createInitialBachecaLabels());
  const [savedLabels, setSavedLabels] = useState<BachecaLabel[]>(() => createInitialBachecaLabels());
  const [loading, setLoading] = useState(Boolean(clubId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadLabels = useCallback(async () => {
    if (!clubId) {
      const initial = createInitialBachecaLabels();
      setLabels(initial);
      setSavedLabels(initial);
      setHydrated(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHydrated(false);
    try {
      const response = await fetch(`${API_PATH}?clubId=${encodeURIComponent(clubId)}`, {
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load bacheca labels');
      }
      if (Array.isArray(data.labels)) {
        const loaded = (data.labels as BachecaLabel[]).map((label) =>
          normalizeBachecaLabel(label),
        );
        setLabels(loaded);
        setSavedLabels(loaded);
      }
      setHydrated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bacheca labels');
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const applyLabel = useCallback(
    async (label: Pick<BachecaLabel, 'id' | 'name' | 'activated' | 'content' | 'updatedOn'>) => {
      if (!clubId) {
        setError('No club selected');
        return false;
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch(`${API_PATH}?clubId=${encodeURIComponent(clubId)}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(label),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to save bacheca label');
        }

        const saved = data.label as BachecaLabel | undefined;
        if (saved?.id) {
          setLabels((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
          setSavedLabels((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        } else {
          const normalized = {
            ...label,
            name: label.name.trim(),
            updatedOn: (label.updatedOn ?? '').trim(),
          };
          setLabels((prev) =>
            prev.map((item) => (item.id === label.id ? { ...item, ...normalized } : item)),
          );
          setSavedLabels((prev) =>
            prev.map((item) => (item.id === label.id ? { ...item, ...normalized } : item)),
          );
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save bacheca label');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clubId],
  );

  return {
    labels,
    savedLabels,
    setLabels,
    loading,
    saving,
    error,
    hydrated,
    applyLabel,
    reload: loadLabels,
  };
}
