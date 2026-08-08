/**
 * Musical genres for the Music OGP "Musical genre" filter dropdown.
 * Spellings match the product UI (e.g. Psichedelic, Rithm n blues).
 */

export const ALL_MUSICAL_GENRES = 'All';

export const MUSICAL_GENRES = [
  'Pop',
  'Rap',
  'Hiphop',
  'Rock',
  'Hard rock',
  'Alternative rock',
  'Psichedelic rock',
  'Progressive rock',
  'Romantic rock',
  'Classical',
  'Electronica',
  'House',
  'Techno',
  'Ambient',
  'Soft music',
  'Lounge',
  'Chillout',
  'Jazz',
  'Soul jazz',
  'Be bop',
  'Cool jazz',
  'Free jazz',
  'Blues',
  'Rithm n blues',
  'Gospel',
  'Soul',
  'Country',
  'Disco',
  'Salsa',
  'Reggae',
  'Reggaeton',
  'Flamenco',
  'Funk',
  'Indie',
  'Bossa nova',
  'Metal',
  'Others',
] as const;

export type MusicalGenre = (typeof MUSICAL_GENRES)[number];

/** Dropdown options including the default "All" entry. */
export const MUSICAL_GENRE_OPTIONS: readonly string[] = [ALL_MUSICAL_GENRES, ...MUSICAL_GENRES];

/** Type of registration options for the Add music form. */
export const MUSIC_REGISTRATION_TYPES = ['Song', 'Album', 'Playlist'] as const;

export type MusicRegistrationType = (typeof MUSIC_REGISTRATION_TYPES)[number];
