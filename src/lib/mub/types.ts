export type MubScope = 'USER' | 'STAFF' | 'CLUB';

export type MubCategory = 'CLUB_MANAGEMENT' | 'WORKOUT' | 'SOCIAL';

export type MubRoleTemplate = 'CLUB' | 'TEAM' | 'COACH';

export type MubIconSource = 'INTERNAL' | 'EXTERNAL';

export type MubPageQuery = {
  scope: MubScope;
  ownerId?: string | null;
  roleTemplate?: MubRoleTemplate | null;
  category: MubCategory;
};

export type MubButtonDto = {
  id: string;
  sortOrder: number;
  buttonColor: string;
  textFont: string;
  textColor: string;
  iconPath: string | null;
  iconSource: MubIconSource;
  urlToOpen: string | null;
  pageToOpen: string;
  isImported: boolean;
  shortText: string;
  extendedText: string;
  translations: Record<string, { shortText: string; extendedText: string }>;
};

export type MubPageDto = {
  id: string;
  scope: MubScope;
  ownerId: string | null;
  roleTemplate: MubRoleTemplate | null;
  category: MubCategory;
  backgroundColor: string;
  displayMode: number;
  buttons: MubButtonDto[];
};

export type SaveMubButtonInput = {
  id?: string;
  buttonColor: string;
  textFont: string;
  textColor: string;
  iconPath?: string | null;
  iconSource: MubIconSource;
  urlToOpen?: string | null;
  pageToOpen: string;
  translations: Record<string, { shortText?: string; extendedText?: string }>;
};
