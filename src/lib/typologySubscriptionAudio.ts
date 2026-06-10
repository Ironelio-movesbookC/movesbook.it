import { extname, join } from 'path';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const TYPOLOGY_AUDIO_ALLOWED_EXTENSIONS = new Set(['.mp3', '.mp4', '.wav', '.webm']);

export function typologyAudioUserDir(userId: string): string {
  return join(getServerPublicDir(), 'subscription_file', 'playlist', `User_${userId}`);
}

export { typologyAudioPublicUrl } from '@/lib/typologySubscriptionAudio.shared';

export function normalizeTypologyAudioExtension(
  fileName: string
): '.mp3' | '.mp4' | '.wav' | '.webm' | null {
  const extension = extname(fileName).toLowerCase();
  if (extension === '.mpeg') return '.mp3';
  if (!TYPOLOGY_AUDIO_ALLOWED_EXTENSIONS.has(extension)) return null;
  return extension as '.mp3' | '.mp4' | '.wav' | '.webm';
}

export function buildTypologyAudioFileName(
  extension: '.mp3' | '.mp4' | '.wav' | '.webm'
): string {
  return `${Date.now()}${extension}`;
}
