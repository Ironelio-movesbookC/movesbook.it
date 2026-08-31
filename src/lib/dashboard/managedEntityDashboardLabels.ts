export type ManagedEntityDashboardKind = 'team' | 'group' | 'coach';

export interface ManagedEntityDashboardLabels {
  myEntities: string;
  sharedEntities: string;
  otherEntities: string;
  profileButton: string;
  fallbackEntityName: string;
}

export function getManagedEntityDashboardLabels(
  kind: ManagedEntityDashboardKind,
): ManagedEntityDashboardLabels {
  switch (kind) {
    case 'team':
      return {
        myEntities: 'My teams',
        sharedEntities: 'My shared teams',
        otherEntities: 'Other teams',
        profileButton: 'Team profile',
        fallbackEntityName: 'Team',
      };
    case 'group':
      return {
        myEntities: 'My groups',
        sharedEntities: 'My shared groups',
        otherEntities: 'Other groups',
        profileButton: 'Group profile',
        fallbackEntityName: 'Group',
      };
    case 'coach':
      return {
        myEntities: 'My coaching groups',
        sharedEntities: 'My shared coaching groups',
        otherEntities: 'Other coaching groups',
        profileButton: 'Coaching group profile',
        fallbackEntityName: 'Coaching group',
      };
  }
}

export function getManagedEntityProfilePath(
  kind: ManagedEntityDashboardKind,
  entityId: string,
): string {
  switch (kind) {
    case 'team':
      return `/my-team?teamId=${encodeURIComponent(entityId)}`;
    case 'group':
      return `/my-group?groupId=${encodeURIComponent(entityId)}`;
    case 'coach':
      return `/my-coaching-group?groupId=${encodeURIComponent(entityId)}`;
  }
}
