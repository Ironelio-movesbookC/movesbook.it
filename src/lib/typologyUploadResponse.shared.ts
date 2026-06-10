/** Client-safe upload debug shape returned by typology icon/audio APIs. */

export type TypologyUploadKind = 'typology-icon' | 'typology-audio';

export type TypologyUploadDetails = {
  kind: TypologyUploadKind;
  publicDir: string;
  uploadDir: string;
  savedPath?: string;
  servedUrl?: string;
  fileName?: string;
  bytesWritten?: number;
  verifiedOnDisk?: boolean;
  nodeEnv?: string;
  cwd?: string;
  source?: 'import' | 'recording';
  typologyId?: string;
  storageUserId?: string;
  dbSongUpdated?: boolean;
  hint?: string;
  cause?: string;
};

export function formatTypologyUploadAlert(
  data: { error?: string; message?: string; details?: TypologyUploadDetails } | null,
  fallback: string
): string {
  if (!data) return fallback;

  const lines: string[] = [];
  if (data.error) lines.push(data.error);
  else if (data.message) lines.push(data.message);

  const d = data.details;
  if (d && typeof d === 'object') {
    if (d.kind) lines.push(`Type: ${d.kind}`);
    if (d.source) lines.push(`Source: ${d.source}`);
    if (d.publicDir) lines.push(`Public dir: ${d.publicDir}`);
    if (d.uploadDir) lines.push(`Upload dir: ${d.uploadDir}`);
    if (d.savedPath) lines.push(`Saved file: ${d.savedPath}`);
    if (d.servedUrl) lines.push(`Browser URL: ${d.servedUrl}`);
    if (d.fileName) lines.push(`Filename: ${d.fileName}`);
    if (typeof d.bytesWritten === 'number') lines.push(`Bytes: ${d.bytesWritten}`);
    if (typeof d.verifiedOnDisk === 'boolean') {
      lines.push(`Verified on disk: ${d.verifiedOnDisk ? 'yes' : 'no'}`);
    }
    if (d.dbSongUpdated !== undefined) {
      lines.push(`DB song column updated: ${d.dbSongUpdated ? 'yes' : 'no'}`);
    }
    if (d.nodeEnv) lines.push(`NODE_ENV: ${d.nodeEnv}`);
    if (d.cwd) lines.push(`process.cwd(): ${d.cwd}`);
    if (d.hint) lines.push(`Hint: ${d.hint}`);
    if (d.cause) lines.push(`Cause: ${d.cause}`);
  }

  return lines.length > 0 ? lines.join('\n') : fallback;
}
