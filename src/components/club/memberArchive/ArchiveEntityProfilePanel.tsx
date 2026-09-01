'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ClubProfileEditor, {
  type ClubProfileSavePayload,
} from '@/components/club/ClubProfileEditor';
import TeamProfileEditor, {
  type TeamProfileFormPayload,
} from '@/components/team/TeamProfileEditor';
import { clubProfilePayloadForApi } from '@/lib/club/clubProfilePayload';
import {
  isClubCreatedFromForm,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { applyEntityLogoOnSave } from '@/lib/entity/applyEntityLogoOnSave';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import { useAuth } from '@/hooks/useAuth';

type EntityRecord = {
  id: string;
  name: string;
  description?: string | null;
  sport?: string | null;
  location?: string | null;
};

type Props = {
  clubId: string | null;
};

/** True only for entities created/saved with the Team tabbed form. */
function isTeamEntity(description?: string | null): boolean {
  const meta = parseClubDescriptionMeta(description);
  const tp = meta.teamProfile;
  if (!tp || typeof tp !== 'object') return false;
  return Object.keys(tp).length > 0;
}

/**
 * Athletes\Members profile panel.
 * Clubs → ClubProfileEditor (same as Create Club / My Club edit on profile_002).
 * Teams → TeamProfileEditor (same as Create Team / My Team edit).
 */
export default function ArchiveEntityProfilePanel({ clubId }: Props) {
  const { user } = useAuth();
  const [entity, setEntity] = useState<EntityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const useTeamEditor = useMemo(
    () => (entity ? isTeamEntity(entity.description) : false),
    [entity],
  );

  const load = useCallback(async () => {
    if (!clubId) {
      setEntity(null);
      setError('Select a club or team under My clubs first.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSavedMsg('');
    try {
      const res = await fetch(
        withSelectedClubId(`/api/clubs/${encodeURIComponent(clubId)}/members`),
        { headers: getAuthHeaders() },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Failed to load club/team profile',
        );
      }
      const loaded = json.club as EntityRecord | undefined;
      if (!loaded) {
        throw new Error('Club/team not found');
      }
      if (!isClubCreatedFromForm(loaded)) {
        throw new Error(
          'This club/team has no profile form yet. Create or complete the profile under My Club / My Team first.',
        );
      }
      setEntity(loaded);
    } catch (e: unknown) {
      setEntity(null);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveClub = async (payload: ClubProfileSavePayload) => {
    if (!clubId) return;
    setSaving(true);
    setSavedMsg('');
    try {
      if (payload.logoFile || payload.removeLogo) {
        await applyEntityLogoOnSave('club', clubId, payload);
      }
      const res = await fetch(
        withSelectedClubId(`/api/clubs/${encodeURIComponent(clubId)}`),
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(clubProfilePayloadForApi(payload)),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Failed to save profile',
        );
      }
      setSavedMsg('Club profile saved.');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeam = async (payload: TeamProfileFormPayload) => {
    if (!clubId) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await fetch(
        withSelectedClubId(`/api/clubs/${encodeURIComponent(clubId)}`),
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' ? json.error : 'Failed to save profile',
        );
      }
      setSavedMsg('Team profile saved.');
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading Club / Team profile…
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {error || 'No profile available.'}
      </div>
    );
  }

  return (
    <div className="space-y-3" key={`${entity.id}-${useTeamEditor ? 'team' : 'club'}`}>
      {savedMsg ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {savedMsg}
        </p>
      ) : null}
      {useTeamEditor ? (
        <TeamProfileEditor
          mode="edit"
          entityKind="team"
          adminUsername={user?.username || 'admin'}
          initialTeam={{
            name: entity.name,
            description: entity.description,
            sport: entity.sport,
          }}
          saving={saving}
          onSave={handleSaveTeam}
        />
      ) : (
        <ClubProfileEditor
          mode="edit"
          entityKind="club"
          adminUsername={user?.username || 'admin'}
          initialClub={{
            name: entity.name,
            description: entity.description,
            location: entity.location,
          }}
          saving={saving}
          onSave={handleSaveClub}
        />
      )}
    </div>
  );
}
