'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ModernNavbar from '@/components/ModernNavbar';
import ClubProfileEditor, {
  type ClubProfileFormPayload,
} from '@/components/club/ClubProfileEditor';
import { useAuth } from '@/hooks/useAuth';
import { isClubCreatedFromForm } from '@/lib/club/clubSidebarLabel';
import type { ManagedEntityKind } from '@/lib/entity/entityProfileLabels';

type EntityRecord = {
  name: string;
  description?: string | null;
  location?: string | null;
};

function EditEntityProfileContent({
  entityKind,
  entityLabel,
  membersApiPath,
  patchApiPath,
  backPath,
  allowedUserTypes,
}: {
  entityKind: ManagedEntityKind;
  entityLabel: string;
  membersApiPath: (id: string) => string;
  patchApiPath: (id: string) => string;
  backPath: (id: string) => string;
  allowedUserTypes: string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const entityId = searchParams?.get('groupId');

  const [entity, setEntity] = useState<EntityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const responseKey =
    entityKind === 'coaching-group' ? 'coachingGroup' : entityKind === 'group' ? 'group' : 'club';

  const loadEntity = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(membersApiPath(entityId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load ${entityLabel}`);
      }
      const data = await res.json();
      const loaded = data[responseKey] as EntityRecord | undefined;
      if (!loaded || !isClubCreatedFromForm(loaded)) {
        throw new Error(`This ${entityLabel} profile cannot be edited here`);
      }
      setEntity(loaded);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : `Failed to load ${entityLabel}`);
      setEntity(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityLabel, membersApiPath, responseKey]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }
    void loadEntity();
  }, [entityId, loadEntity]);

  const handleSave = async (payload: ClubProfileFormPayload) => {
    if (!entityId) return;
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not signed in');

    setSaving(true);
    try {
      const res = await fetch(patchApiPath(entityId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to save ${entityLabel} profile`);
      }
      router.push(backPath(entityId));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (!allowedUserTypes.includes(user.userType)) {
    router.replace('/my-page');
    return null;
  }

  const backHref = entityId ? backPath(entityId) : '/my-page';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      <ModernNavbar />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Back to {entityLabel}
        </Link>

        {!entityId ? (
          <p className="text-sm text-red-600">
            Missing {entityLabel}. Open one from the dashboard first.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        ) : entity ? (
          <div className="rounded-lg border border-gray-300 bg-white shadow-xl overflow-hidden">
            <ClubProfileEditor
              mode="edit"
              entityKind={entityKind}
              adminUsername={user.username}
              initialClub={entity}
              onSave={handleSave}
              saving={saving}
              onCancel={() => router.push(backHref)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EditCoachingGroupProfilePage() {
  return (
    <EditEntityProfileContent
      entityKind="coaching-group"
      entityLabel="trained group"
      membersApiPath={(id) => `/api/coaching-groups/${id}/members`}
      patchApiPath={(id) => `/api/coaching-groups/${id}`}
      backPath={(id) => `/my-coaching-group?groupId=${encodeURIComponent(id)}`}
      allowedUserTypes={['COACH']}
    />
  );
}

export function EditGroupAdminProfilePage() {
  return (
    <EditEntityProfileContent
      entityKind="group"
      entityLabel="group"
      membersApiPath={(id) => `/api/groups/${id}/members`}
      patchApiPath={(id) => `/api/groups/${id}`}
      backPath={(id) => `/my-group?groupId=${encodeURIComponent(id)}`}
      allowedUserTypes={['GROUP', 'GROUP_ADMIN']}
    />
  );
}

export default function EditCoachingGroupProfilePageDefault() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <EditCoachingGroupProfilePage />
    </Suspense>
  );
}
