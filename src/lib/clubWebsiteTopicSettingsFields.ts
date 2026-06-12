/** Shared topic / subtopic settings (List of friends + Topics available). */

export type ClubWebsiteContentDisplayMode = 'editor' | 'link';

export type ClubWebsiteTopicAudience = {
  activeMembers: boolean;
  authorizedMembers: boolean;
  notActiveMembers: boolean;
};

export type ClubWebsiteTopicSettingsFields = {
  showInClubDashboardTopics: boolean;
  contentDisplayMode: ClubWebsiteContentDisplayMode;
  externalUrl: string;
  openInSamePage: boolean;
  audience: ClubWebsiteTopicAudience;
};

export const DEFAULT_TOPIC_AUDIENCE: ClubWebsiteTopicAudience = {
  activeMembers: true,
  authorizedMembers: true,
  notActiveMembers: false,
};

export const DEFAULT_TOPIC_SETTINGS_FIELDS: ClubWebsiteTopicSettingsFields = {
  showInClubDashboardTopics: false,
  contentDisplayMode: 'editor',
  externalUrl: '',
  openInSamePage: true,
  audience: { ...DEFAULT_TOPIC_AUDIENCE },
};

export function normalizeTopicSettingsFields(
  partial?: Partial<ClubWebsiteTopicSettingsFields>
): ClubWebsiteTopicSettingsFields {
  return {
    showInClubDashboardTopics:
      partial?.showInClubDashboardTopics ?? DEFAULT_TOPIC_SETTINGS_FIELDS.showInClubDashboardTopics,
    contentDisplayMode:
      partial?.contentDisplayMode ?? DEFAULT_TOPIC_SETTINGS_FIELDS.contentDisplayMode,
    externalUrl: partial?.externalUrl ?? '',
    openInSamePage: partial?.openInSamePage ?? DEFAULT_TOPIC_SETTINGS_FIELDS.openInSamePage,
    audience: {
      activeMembers: partial?.audience?.activeMembers ?? DEFAULT_TOPIC_AUDIENCE.activeMembers,
      authorizedMembers:
        partial?.audience?.authorizedMembers ?? DEFAULT_TOPIC_AUDIENCE.authorizedMembers,
      notActiveMembers:
        partial?.audience?.notActiveMembers ?? DEFAULT_TOPIC_AUDIENCE.notActiveMembers,
    },
  };
}

/** UI-only until member roles are wired — always true when no member context. */
export function isTopicAudienceAllowed(
  audience: ClubWebsiteTopicAudience,
  memberKind: 'active' | 'authorized' | 'not_active' = 'active'
): boolean {
  if (memberKind === 'active') return audience.activeMembers;
  if (memberKind === 'authorized') return audience.authorizedMembers;
  return audience.notActiveMembers;
}

export type ClubWebsiteTopicSettingsFormItem = {
  id: string;
  name: string;
  activated: boolean;
} & ClubWebsiteTopicSettingsFields;

export type ClubWebsiteTopicSettingsVariant = 'root' | 'topic' | 'subtopic';
