import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export type ChatChannelSettings = {
  photoUrl: string | null;
  channelName: string;
  updatedAt: string | null;
};

const PLATFORM_DEFAULT: ChatChannelSettings = {
  photoUrl: null,
  channelName: 'Movesbook channel',
  updatedAt: null,
};

const CLUB_DEFAULT: ChatChannelSettings = {
  photoUrl: null,
  channelName: 'Club channel',
  updatedAt: null,
};

function chatUploadDir(clubId?: string | null): string {
  const base = join(getServerPublicDir(), 'uploads', 'chat');
  const id = typeof clubId === 'string' ? clubId.trim() : '';
  return id ? join(base, 'clubs', id) : base;
}

function settingsPath(clubId?: string | null): string {
  return join(chatUploadDir(clubId), 'channel-settings.json');
}

function defaultSettings(clubId?: string | null): ChatChannelSettings {
  return typeof clubId === 'string' && clubId.trim()
    ? { ...CLUB_DEFAULT }
    : { ...PLATFORM_DEFAULT };
}

export async function ensureChatUploadDir(clubId?: string | null): Promise<string> {
  const dir = chatUploadDir(clubId);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function readChannelSettings(
  clubId?: string | null
): Promise<ChatChannelSettings> {
  const defaults = defaultSettings(clubId);
  try {
    const raw = await readFile(settingsPath(clubId), 'utf-8');
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
          : defaults.channelName,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
          ? parsed.updatedAt.trim()
          : null,
    };
  } catch {
    return { ...defaults };
  }
}

export async function writeChannelSettings(
  patch: Partial<ChatChannelSettings>,
  clubId?: string | null
): Promise<ChatChannelSettings> {
  await ensureChatUploadDir(clubId);
  const current = await readChannelSettings(clubId);
  const defaults = defaultSettings(clubId);
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
        : current.channelName || defaults.channelName,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(settingsPath(clubId), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/** Remove previous channel photo files, keeping settings JSON and the optional keepName. */
export async function clearOldChannelPhotos(
  keepName?: string,
  clubId?: string | null
): Promise<void> {
  const dir = await ensureChatUploadDir(clubId);
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

export function channelPhotoPublicPath(fileName: string, clubId?: string | null): string {
  const id = typeof clubId === 'string' ? clubId.trim() : '';
  return id ? `/uploads/chat/clubs/${id}/${fileName}` : `/uploads/chat/${fileName}`;
}
