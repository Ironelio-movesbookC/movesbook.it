import { NextRequest } from 'next/server';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { verifyToken } from '@/lib/auth';
import { getServerPublicDir, verifyPublicFile } from '@/lib/serverPublicDir';
import {
  formatUploadCause,
  typologyUploadError,
  typologyUploadSuccess
} from '@/lib/typologyUploadResponse';

export const dynamic = 'force-dynamic';

const MAX_ICON_BYTES = 5 * 1024 * 1024;
const TYPOLOGY_ICON_DIR = ['img', 'typology_image'];
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp'
]);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp']);
const ALLOWED_FORMATS_ERROR = 'Only JPG, PNG, GIF, or BMP icons are allowed';

type TypologyIconExtension = '.png' | '.jpg' | '.gif' | '.bmp';

const CAT_ICON_FILE_PATTERN = /^Cat_(\d+)\.(png|jpe?g|gif|bmp)$/i;

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function normalizeExtension(fileName: string): TypologyIconExtension | null {
  const extension = extname(fileName).toLowerCase();
  if (extension === '.jpeg') return '.jpg';
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;
  return extension as TypologyIconExtension;
}

function detectImageFormat(buffer: Buffer): TypologyIconExtension | null {
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return '.png';
  }

  if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return '.jpg';
  }

  if (
    buffer.length > 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return '.gif';
  }

  if (buffer.length > 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return '.bmp';
  }

  return null;
}

async function getNextCatFileName(uploadDir: string, extension: TypologyIconExtension) {
  const files = await readdir(uploadDir).catch(() => []);
  const highestNumber = files.reduce((highest, fileName) => {
    const match = fileName.match(CAT_ICON_FILE_PATTERN);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]) || 0);
  }, 0);

  return `Cat_${highestNumber + 1}${extension}`;
}

async function writeNextCatIcon(
  uploadDir: string,
  extension: TypologyIconExtension,
  buffer: Buffer
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const fileName = await getNextCatFileName(uploadDir, extension);

    try {
      await writeFile(join(uploadDir, fileName), buffer, { flag: 'wx' });
      return fileName;
    } catch (error) {
      const code = error instanceof Error && 'code' in error
        ? (error as { code?: string }).code
        : undefined;

      if (code === 'EEXIST') continue;
      throw error;
    }
  }

  throw new Error('Unable to reserve a typology icon filename');
}

export async function POST(request: NextRequest) {
  const uploadDir = join(getServerPublicDir(), ...TYPOLOGY_ICON_DIR);

  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return typologyUploadError('Unauthorized', 401, {
        kind: 'typology-icon',
        uploadDir
      });
    }

    if (!isClubAccountUserType(String(decoded.userType))) {
      return typologyUploadError('Forbidden', 403, { kind: 'typology-icon', uploadDir });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return typologyUploadError('No icon file provided', 400, { kind: 'typology-icon', uploadDir });
    }

    if (file.size > MAX_ICON_BYTES) {
      return typologyUploadError('Icon file exceeds 5MB', 400, {
        kind: 'typology-icon',
        uploadDir,
        bytesWritten: file.size
      });
    }

    const uploadFileName = file instanceof File ? file.name : 'upload.png';
    const nameExtension = normalizeExtension(uploadFileName);
    if (!nameExtension) {
      return typologyUploadError(ALLOWED_FORMATS_ERROR, 400, { kind: 'typology-icon', uploadDir });
    }

    if (
      file.type &&
      file.type !== 'application/octet-stream' &&
      !ALLOWED_MIME_TYPES.has(file.type)
    ) {
      return typologyUploadError(ALLOWED_FORMATS_ERROR, 400, { kind: 'typology-icon', uploadDir });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return typologyUploadError(
        'The uploaded file is empty. Check server/proxy upload limits (nginx client_max_body_size).',
        400,
        { kind: 'typology-icon', uploadDir }
      );
    }

    const detectedFormat = detectImageFormat(buffer);
    if (!detectedFormat) {
      return typologyUploadError('The selected file is not a valid image icon', 400, {
        kind: 'typology-icon',
        uploadDir,
        bytesWritten: buffer.length
      });
    }

    await mkdir(uploadDir, { recursive: true });

    const fileName = await writeNextCatIcon(uploadDir, detectedFormat, buffer);
    const savedPath = join(uploadDir, fileName);
    const servedUrl = `/img/typology_image/${fileName}`;
    const verified = await verifyPublicFile(savedPath);

    if (!verified) {
      return typologyUploadError(
        'Icon was written but could not be verified on disk. The file may be in a folder that Next.js does not serve.',
        500,
        {
          kind: 'typology-icon',
          uploadDir,
          savedPath,
          servedUrl,
          fileName,
          bytesWritten: buffer.length,
          verifiedOnDisk: false
        }
      );
    }

    return typologyUploadSuccess(
      'typology-icon',
      {
        message: 'Icon saved on disk and verified. Open Browser URL in details to confirm it is reachable.',
        image: fileName,
        fileName,
        url: servedUrl,
        path: servedUrl
      },
      {
        uploadDir,
        savedPath,
        servedUrl,
        fileName,
        bytesWritten: buffer.length,
        verifiedOnDisk: true
      }
    );
  } catch (error) {
    console.error('POST /api/club/settings/typology-subscription/icon:', error);
    return typologyUploadError('Icon upload failed', 500, {
      kind: 'typology-icon',
      uploadDir,
      cause: formatUploadCause(error)
    });
  }
}
