import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export type ChatChannelSettings = {
  photoUrl: string | null;
  channelName: string;
  updatedAt: string | null;
};

const DEFAULT_SETTINGS: ChatChannelSettings = {
  photoUrl: null,
  channelName: 'Movesbook channel',
  updatedAt: null,
};

function chatUploadDir(): string {
  return join(getServerPublicDir(), 'uploads', 'chat');
}

function settingsPath(): string {
  return join(chatUploadDir(), 'channel-settings.json');
}

export async function ensureChatUploadDir(): Promise<string> {
  const dir = chatUploadDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function readChannelSettings(): Promise<ChatChannelSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ChatChannelSettings>;
    const photoUrl =
      typeof parsed.photoUrl === 'string' && parsed.photoUrl.trim()
        ? parsed.photoUrl.trim()
        : null;
    return {
      photoUrl,
      channelName:
        typeof parsed.channelName === 'string' && parsed.channelName.trim()
          ? parsed.channelName.trim()
          : DEFAULT_SETTINGS.channelName,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
          ? parsed.updatedAt.trim()
          : null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeChannelSettings(
  patch: Partial<ChatChannelSettings>
): Promise<ChatChannelSettings> {
  await ensureChatUploadDir();
  const current = await readChannelSettings();
  const next: ChatChannelSettings = {
    photoUrl:
      patch.photoUrl === undefined
        ? current.photoUrl
        : patch.photoUrl && patch.photoUrl.trim()
          ? patch.photoUrl.trim()
          : null,
    channelName:
      typeof patch.channelName === 'string' && patch.channelName.trim()
        ? patch.channelName.trim()
        : current.channelName,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/** Remove previous channel photo files, keeping settings JSON and the optional keepName. */
export async function clearOldChannelPhotos(keepName?: string): Promise<void> {
  const dir = await ensureChatUploadDir();
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => {
        if (name === 'channel-settings.json') return false;
        if (keepName && name === keepName) return false;
        return /^channel-photo/i.test(name);
      })
      .map(async (name) => {
        try {
          await unlink(join(dir, name));
        } catch {
          /* ignore */
        }
      })
  );
}
