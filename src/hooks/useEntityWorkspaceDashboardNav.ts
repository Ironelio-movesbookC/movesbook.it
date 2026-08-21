'use client';

import { useEffect, useRef } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { EntityDirectAccessKind } from '@/lib/entity/entityDirectAccessMeta';
import {
  ENTITY_WORKSPACE_DASHBOARD,
  resolveEntityWorkspaceEntityId,
  shouldOpenEntityWorkspaceTab,
} from '@/lib/entity/entityWorkspaceDashboard';

type SearchParamsLike = {
  get(name: string): string | null;
} | null;

type UseEntityWorkspaceDashboardNavOptions = {
  kind: EntityDirectAccessKind;
  searchParams: SearchParamsLike;
  router: AppRouterInstance;
  entityDirectAccessLocked: boolean;
  activeTab: 'my-page' | 'my-entity';
  setActiveTab: (tab: 'my-page' | 'my-entity') => void;
  setSelectedEntityId: (id: string) => void;
  setMyEntityTabVisible: (visible: boolean) => void;
};

/** Apply entity username + company password / direct access landing on dashboard My Entity tab. */
export function useEntityWorkspaceDashboardNav({
  kind,
  searchParams,
  router,
  entityDirectAccessLocked,
  activeTab,
  setActiveTab,
  setSelectedEntityId,
  setMyEntityTabVisible,
}: UseEntityWorkspaceDashboardNavOptions): void {
  const config = ENTITY_WORKSPACE_DASHBOARD[kind];
  const initialNavApplied = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || initialNavApplied.current) return;

    const urlEntityId = searchParams?.get(config.idQueryParam);
    const urlTab = searchParams?.get('tab');
    const entityId = resolveEntityWorkspaceEntityId(kind, { urlEntityId });
    const openMyEntityTab = shouldOpenEntityWorkspaceTab(kind, {
      urlEntityId,
      urlTab,
    });

    if (entityId) {
      setSelectedEntityId(entityId);
      localStorage.setItem(config.storageKey, entityId);
    }

    if (openMyEntityTab) {
      setActiveTab('my-entity');
      setMyEntityTabVisible(true);
      if (urlEntityId || urlTab) {
        router.replace(config.dashboardPath, { scroll: false });
      }
    } else {
      setActiveTab('my-page');
      setMyEntityTabVisible(false);
    }

    initialNavApplied.current = true;
  }, [
    kind,
    config.dashboardPath,
    config.idQueryParam,
    config.storageKey,
    router,
    searchParams,
    setActiveTab,
    setMyEntityTabVisible,
    setSelectedEntityId,
  ]);

  useEffect(() => {
    if (!entityDirectAccessLocked || activeTab === 'my-entity') return;
    const entityId = resolveEntityWorkspaceEntityId(kind);
    if (entityId) {
      setSelectedEntityId(entityId);
      localStorage.setItem(config.storageKey, entityId);
    }
    setActiveTab('my-entity');
    setMyEntityTabVisible(true);
  }, [
    activeTab,
    config.storageKey,
    entityDirectAccessLocked,
    kind,
    setActiveTab,
    setMyEntityTabVisible,
    setSelectedEntityId,
  ]);
}
