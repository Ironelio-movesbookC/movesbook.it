import { SportType } from '@prisma/client';

export const LANGUAGE_CODE_MAP: Record<string, string> = {
  '1': 'en',
  '2': 'fr',
  '3': 'de',
  '4': 'it',
  '5': 'es',
  '6': 'pt',
  '7': 'ru',
  '8': 'hi',
  '9': 'zh',
  '10': 'ar',
};

export const LANGUAGE_ID_MAP: Record<string, number> = {
  'en': 1,
  'fr': 2,
  'de': 3,
  'it': 4,
  'es': 5,
  'pt': 6,
  'ru': 7,
  'hi': 8,
  'zh': 9,
  'ar': 10,
};

export const LANGUAGE_CODE_TO_ID_MAP: Record<number, string> = {
  1: 'en',
  2: 'fr',
  3: 'de',
  4: 'it',
  5: 'es',
  6: 'pt',
  7: 'ru',
  8: 'hi',
  9: 'zh',
  10: 'ar',
};

export const SPORT_ID_TO_SPORT_TYPE: Record<string, SportType> = {
  '1': SportType.TRACK_FIELD,
  '4': SportType.BASKETBALL,
  '9': SportType.BIKE,
  '11': SportType.MARTIAL_ARTS,
  '14': SportType.RUN,
  '15': SportType.SOCCER,
  '17': SportType.TENNIS,
  '18': SportType.TRIATHLON,
  '19': SportType.VOLLEYBALL,
  '29': SportType.BOXING,
};

export const DOCUMENT_TYPES = [
  { value: 'articles', label: 'Articles' },
  { value: 'document', label: 'Document' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'interview', label: 'Interview' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'middle', label: 'Middle' },
  { value: 'low', label: 'Low' },
] as const;

export const DISPLAY_MODE_OPTIONS = [
  { value: '1', label: 'Same page' },
  { value: '2', label: 'Another label' },
  { value: '3', label: 'Another page' },
] as const;
