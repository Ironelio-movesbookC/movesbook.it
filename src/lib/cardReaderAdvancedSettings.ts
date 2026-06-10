export type AdvancedSettingsModeConfig = {
  title: string;
  subtitle: string;
  tableCandidates: string[];
};

export const CARD_READER_ADVANCED_MODES: Record<number, AdvancedSettingsModeConfig> = {
  1: {
    title: 'Setting for the primary control',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_primary_control_settings'],
  },
  2: {
    title: 'Setting for the access control',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_sport_hall_settings', 'club_cardreader_sporthall_settings'],
  },
  3: {
    title: 'Setting for the parking',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_parking_settings'],
  },
  4: {
    title: 'Internal end-user station',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_internal_station_settings'],
  },
  5: {
    title: 'Purchase products',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_purchase_product_settings'],
  },
  6: {
    title: 'Services to decrease',
    subtitle: 'Advanced settings',
    tableCandidates: ['club_cardreader_services_to_decrease_settings'],
  },
};

export const ADVANCED_SETTINGS_SKIP_COLUMNS = new Set([
  'id',
  'reader_type_id',
  'club_id',
  'user_id',
  'created',
  'modified',
]);

export function humanizeFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isYesNoField(value: unknown): boolean {
  if (value === 'Y' || value === 'N') return true;
  if (value === 'y' || value === 'n') return true;
  return false;
}
