import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/lib/auth';
import { collectReferencedUploadPaths, deleteUnreferencedUserMediaFiles } from '@/lib/userMediaUploadCleanup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Fetch user data (MIGRATED DATA!)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        firstName: true,
        surname: true,
        country: true,
        gender: true,
        birthdate: true,
        image: true,
        profileBanner: true,
        profileBannerAlignment: true,
        profileBannerSequence: true,
        profileBannerVideo: true,
        userType: true,
        createdAt: true,
        telegramAccount: true,
        youtubeChannelUrl: true,
        mainSports: {
          select: { sport: true, order: true },
          orderBy: { order: 'asc' },
        },
        
        // Include related data from migration
        settings: true,
        periods: {
          select: {
            id: true,
            name: true,
            color: true,
            description: true
          }
        },
        sections: {
          select: {
            id: true,
            name: true,
            color: true,
            description: true
          }
        },
        
        // If you migrated clubs
        clubMemberships: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        
        // If you migrated coach relationships
        coaches: {
          include: {
            coach: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        
        // If you migrated athlete relationships
        athletes: {
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        
        // Workout stats
        _count: {
          select: {
            workoutPlans: true,
            workoutTemplates: true,
            clubMemberships: true
          }
        }
      } as Prisma.UserSelect
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      profileBanner,
      profileBannerAlignment,
      profileBannerSequence,
      profileBannerVideo,
      image,
      name,
      firstName,
      surname,
      country,
      language,
      gender,
      birthdate,
    } = body as {
      profileBanner?: string | null;
      profileBannerAlignment?: string | null;
      profileBannerSequence?: string | null | unknown[];
      profileBannerVideo?: string | null;
      image?: string | null;
      name?: string | null;
      firstName?: string | null;
      surname?: string | null;
      country?: string | null;
      language?: string | null;
      gender?: string | null;
      birthdate?: string | null;
    };

    const data: {
      profileBanner?: string | null;
      profileBannerAlignment?: string | null;
      profileBannerSequence?: string | null;
      profileBannerVideo?: string | null;
      image?: string | null;
      name?: string;
      firstName?: string | null;
      surname?: string | null;
      country?: string | null;
      gender?: string | null;
      birthdate?: Date | null;
    } = {};

    if (profileBanner !== undefined) {
      data.profileBanner = profileBanner === null || profileBanner === '' ? null : String(profileBanner);
    }

    if (profileBannerAlignment !== undefined) {
      const a = profileBannerAlignment === null || profileBannerAlignment === '' ? null : String(profileBannerAlignment);
      if (a !== null && a !== 'center' && a !== 'default') {
        return NextResponse.json({ error: 'Invalid profileBannerAlignment' }, { status: 400 });
      }
      data.profileBannerAlignment = a;
    }

    if (profileBannerSequence !== undefined) {
      if (profileBannerSequence === null || profileBannerSequence === '') {
        data.profileBannerSequence = null;
      } else {
        let arr: unknown;
        try {
          arr =
            typeof profileBannerSequence === 'string'
              ? JSON.parse(profileBannerSequence)
              : profileBannerSequence;
        } catch {
          return NextResponse.json({ error: 'Invalid profileBannerSequence JSON' }, { status: 400 });
        }
        if (!Array.isArray(arr)) {
          return NextResponse.json({ error: 'profileBannerSequence must be an array' }, { status: 400 });
        }
        const paths = arr
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
          .filter((x) => x.length <= 512)
          .slice(0, 30);
        data.profileBannerSequence = JSON.stringify(paths);
        if (paths.length > 0) {
          data.profileBanner = paths[0];
        }
      }
    }

    if (profileBannerVideo !== undefined) {
      data.profileBannerVideo =
        profileBannerVideo === null || profileBannerVideo === ''
          ? null
          : String(profileBannerVideo).trim().slice(0, 512);
    }

    if (image !== undefined) {
      data.image = image === null || image === '' ? null : String(image).trim().slice(0, 512);
    }

    if (name !== undefined) {
      const trimmed = String(name ?? '').trim();
      if (trimmed.length > 0) {
        data.name = trimmed.slice(0, 120);
      }
    }

    if (firstName !== undefined) {
      const trimmed = String(firstName ?? '').trim();
      data.firstName = trimmed.length > 0 ? trimmed.slice(0, 80) : null;
    }

    if (surname !== undefined) {
      const trimmed = String(surname ?? '').trim();
      data.surname = trimmed.length > 0 ? trimmed.slice(0, 80) : null;
    }

    if (country !== undefined) {
      const trimmed = String(country ?? '').trim();
      data.country = trimmed.length > 0 ? trimmed.slice(0, 80) : null;
    }

    if (gender !== undefined) {
      const trimmed = String(gender ?? '').trim();
      data.gender = trimmed.length > 0 ? trimmed.slice(0, 40) : null;
    }

    if (birthdate !== undefined) {
      if (birthdate === null || birthdate === '') {
        data.birthdate = null;
      } else {
        const parsed = new Date(String(birthdate));
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'Invalid birthdate' }, { status: 400 });
        }
        data.birthdate = parsed;
      }
    }

    const explicitDisplayName = name !== undefined && String(name).trim().length > 0;
    if ((firstName !== undefined || surname !== undefined) && !explicitDisplayName) {
      const current = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { firstName: true, surname: true },
      });
      const fn =
        data.firstName !== undefined ? data.firstName : (current?.firstName ?? null);
      const sn =
        data.surname !== undefined ? data.surname : (current?.surname ?? null);
      const composed = [fn, sn]
        .filter((part) => part != null && String(part).trim().length > 0)
        .join(' ')
        .trim();
      if (composed) {
        data.name = composed.slice(0, 120);
      }
    }

    if (language !== undefined) {
      const lang = String(language ?? '').trim().slice(0, 10) || 'en';
      await prisma.userSettings.upsert({
        where: { userId: decoded.userId },
        update: { language: lang },
        create: {
          userId: decoded.userId,
          language: lang,
          colorSettings: '{}',
          toolsSettings: '{}',
          favouritesSettings: '{}',
          myBestSettings: '{}',
          adminSettings: '{}',
          workoutPreferences: '{}',
          socialSettings: '{}',
          notificationSettings: '{}',
          widgetArrangement: '[]',
        },
      });
    }

    const mediaTouched =
      data.image !== undefined ||
      data.profileBanner !== undefined ||
      data.profileBannerSequence !== undefined ||
      data.profileBannerVideo !== undefined;

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        firstName: true,
        surname: true,
        country: true,
        gender: true,
        birthdate: true,
        image: true,
        profileBanner: true,
        profileBannerAlignment: true,
        profileBannerSequence: true,
        profileBannerVideo: true,
        userType: true,
        settings: { select: { language: true } },
      } as Prisma.UserSelect,
    });

    if (mediaTouched && Object.keys(data).length > 0 && user) {
      try {
        await deleteUnreferencedUserMediaFiles(
          decoded.userId,
          collectReferencedUploadPaths(user),
        );
      } catch (cleanupErr) {
        console.error('User media cleanup after profile PATCH:', cleanupErr);
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}