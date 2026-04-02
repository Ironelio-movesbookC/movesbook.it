import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/lib/auth';

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
        image: true,
        profileBanner: true,
        profileBannerAlignment: true,
        profileBannerSequence: true,
        userType: true,
        createdAt: true,
        telegramAccount: true,
        
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
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
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
    const { profileBanner, profileBannerAlignment, profileBannerSequence } = body as {
      profileBanner?: string | null;
      profileBannerAlignment?: string | null;
      profileBannerSequence?: string | null | unknown[];
      language?: string | null;
    };

    const data: {
      profileBanner?: string | null;
      profileBannerAlignment?: string | null;
      profileBannerSequence?: string | null;
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

    const requestedLanguage = typeof body.language === 'string' ? body.language.trim().toLowerCase() : '';
    if (requestedLanguage) {
      await prisma.userSettings.upsert({
        where: { userId: decoded.userId },
        update: { language: requestedLanguage },
        create: {
          userId: decoded.userId,
          language: requestedLanguage,
          colorSettings: '{}',
          widgetArrangement: '[]',
          toolsSettings: '{}',
          favouritesSettings: '{}',
          myBestSettings: '{}',
          adminSettings: '{}',
          workoutPreferences: '{}',
          socialSettings: '{}',
          notificationSettings: '{}'
        }
      });
    }

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
        image: true,
        profileBanner: true,
        profileBannerAlignment: true,
        profileBannerSequence: true,
        userType: true,
        settings: {
          select: {
            language: true
          }
        }
      },
    });

    return NextResponse.json({ success: true, user, language: user?.settings?.language || 'en' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

