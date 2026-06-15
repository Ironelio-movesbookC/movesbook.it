import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma, prismaConnect, resetPrismaClient } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import { ensureUserSettingsColumns } from '@/lib/userSettingsDb';
import { YOUTUBE_CHANNEL_URL_KEY } from '@/utils/youtubeChannelUrl';

function isPrismaEngineTransportError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientUnknownRequestError)) return false;
  const msg = error.message;
  return msg.includes('Engine was empty') || msg.includes('Engine is not yet connected');
}

/** MySQL 1054 — column exists in Prisma schema but DB not migrated yet */
function isUnknownColumnError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('1054') || msg.includes('Unknown column');
}

// Helper function to safely parse JSON with fallback
function safeJsonParse(jsonString: string | null, defaultValue: any = {}) {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ Failed to parse JSON, using default:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jsonString: jsonString?.substring(0, 100) + '...'
    });
    return defaultValue;
  }
}

async function getUserYoutubeChannelUrl(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ youtubeChannelUrl: string | null }[]>`
    SELECT youtubeChannelUrl
    FROM users_new
    WHERE id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.youtubeChannelUrl ?? null;
}

async function setUserYoutubeChannelUrl(userId: string, value: string | null): Promise<void> {
  await prisma.$executeRaw`
    UPDATE users_new
    SET youtubeChannelUrl = ${value}
    WHERE id = ${userId}
  `;
}

// GET - Fetch user settings (with safe JSON parsing and auto-recovery)

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header (consistent with other APIs)
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    
    // Handle fallback admin - return default settings without database
    if (userId === 'admin') {
      // Import default sports list
      const DEFAULT_SPORTS = [
        { id: '1', name: 'SWIM', icon: '🏊‍♂️', order: 0, isTop5: true },
        { id: '2', name: 'RUN', icon: '🏃‍♂️', order: 1, isTop5: true },
        { id: '3', name: 'BIKE', icon: '🚴‍♂️', order: 2, isTop5: true },
        { id: '4', name: 'BODY_BUILDING', icon: '💪', order: 3, isTop5: true },
        { id: '5', name: 'ROWING', icon: '🚣', order: 4, isTop5: true },
        { id: '6', name: 'SKATE', icon: '⛸️', order: 5, isTop5: false },
        { id: '7', name: 'SKI', icon: '🎿', order: 6, isTop5: false },
        { id: '8', name: 'SNOWBOARD', icon: '🏂', order: 7, isTop5: false },
        { id: '9', name: 'YOGA', icon: '🧘', order: 8, isTop5: false },
        { id: '10', name: 'GYMNASTIC', icon: '🏋️', order: 9, isTop5: false },
        { id: '11', name: 'STRETCHING', icon: '🤸', order: 10, isTop5: false },
        { id: '12', name: 'PILATES', icon: '🥋', order: 11, isTop5: false },
        { id: '13', name: 'TECHNICAL_MOVES', icon: '🎯', order: 12, isTop5: false },
        { id: '14', name: 'FREE_MOVES', icon: '🆓', order: 13, isTop5: false },
      ];
      
      return NextResponse.json({
        userId: 'admin',
        colorSettings: {},
        widgetArrangement: [],
        toolsSettings: {
          sports: DEFAULT_SPORTS,
          sections: [],
          equipment: [],
          exercises: [],
          devices: []
        },
        favouritesSettings: {},
        myBestSettings: {},
        adminSettings: {},
        workoutPreferences: {},
        socialSettings: {},
        notificationSettings: {},
        gridSize: 'comfortable',
        columnCount: 3,
        rowHeight: 'medium',
        defaultView: 'grid',
        leftSidebarVisible: true,
        rightSidebarVisible: true,
        leftSidebarWidth: 20,
        rightSidebarWidth: 25,
        sidebarPosition: 'fixed',
        theme: 'light',
        fontSize: 16,
        iconSize: 'medium',
        sportIconType: 'emoji',
        enableAnimations: true,
        reducedMotion: false,
        highContrast: false,
        performanceMode: false,
        imageQuality: 'high',
        lazyLoading: true,
        dashboardLayout: 'default',
        language: 'en',
        weeklyStructureV1: null,
        youtubeChannelUrl: null
      });
    }

    await prismaConnect();
    await ensureUserSettingsColumns();

    const dbUserId = await resolveWorkoutDatabaseUserId(userId);
    if (!dbUserId) {
      console.error(`❌ No User row for token userId ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    let settings;
    try {
      settings = await prisma.userSettings.findUnique({
        where: { userId: dbUserId }
      });
    } catch (dbError) {
      if (isPrismaEngineTransportError(dbError)) {
        console.warn('⚠️ Prisma engine failed while reading settings; resetting client and retrying once');
        await resetPrismaClient();
        await prismaConnect();
        try {
          settings = await prisma.userSettings.findUnique({
            where: { userId: dbUserId }
          });
        } catch {
          settings = null;
        }
      } else {
        console.error('❌ Database error reading settings (will try to recreate):', dbError);
        try {
          await prisma.userSettings.deleteMany({
            where: { userId: dbUserId }
          });
          console.log('🔧 Deleted settings row after read error');
        } catch (deleteError) {
          console.error('Error deleting settings:', deleteError);
        }
        settings = null;
      }
    }

    if (!settings) {
      const userLanguage = 'en';

      const [colorDefaults, toolsDefaults, favouritesDefaults] = await Promise.all([
        prisma.colorDefaults.findUnique({ where: { language: userLanguage } }),
        prisma.toolsDefaults.findUnique({ where: { language: userLanguage } }),
        prisma.favouritesDefaults.findUnique({ where: { language: userLanguage } })
      ]);

      settings = await prisma.userSettings.create({
        data: {
          userId: dbUserId,
          // JSON Settings loaded from admin defaults
          colorSettings: colorDefaults?.data ? JSON.stringify(colorDefaults.data) : '{}',
          toolsSettings: toolsDefaults?.data ? JSON.stringify(toolsDefaults.data) : '{}',
          favouritesSettings: favouritesDefaults?.data ? JSON.stringify(favouritesDefaults.data) : '{}',
          myBestSettings: '{}',
          adminSettings: '{}',
          workoutPreferences: '{}',
          socialSettings: '{}',
          notificationSettings: '{}',
          widgetArrangement: '[]',
          // Display Settings
          gridSize: 'comfortable',
          columnCount: 3,
          rowHeight: 'medium',
          defaultView: 'grid',
          // Sidebar Settings
          leftSidebarVisible: true,
          rightSidebarVisible: true,
          leftSidebarWidth: 20,
          rightSidebarWidth: 25,
          sidebarPosition: 'fixed',
          // Theme & Display
          theme: 'light',
          fontSize: 16,
          iconSize: 'medium',
          sportIconType: 'emoji',
          // Accessibility
          enableAnimations: true,
          reducedMotion: false,
          highContrast: false,
          // Performance
          performanceMode: false,
          imageQuality: 'high',
          lazyLoading: true,
          // Dashboard
          dashboardLayout: 'default',
          // Language
          language: userLanguage
        }
      });

      console.log('Created user settings with admin defaults');
    }

    // Safely parse all JSON fields with error handling
    const safeJsonParse = (jsonString: string, defaultValue: any, fieldName: string) => {
      try {
        if (!jsonString || jsonString.trim() === '') {
          return defaultValue;
        }
        return JSON.parse(jsonString);
      } catch (error) {
        console.error(`Error parsing ${fieldName}:`, error);
        console.error(`Corrupted JSON for ${fieldName}:`, jsonString?.substring(0, 200));
        return defaultValue;
      }
    };

    const response = {
      ...settings,
      colorSettings: safeJsonParse(settings.colorSettings, {}, 'colorSettings'),
      widgetArrangement: safeJsonParse(settings.widgetArrangement, [], 'widgetArrangement'),
      toolsSettings: safeJsonParse(settings.toolsSettings, {}, 'toolsSettings'),
      favouritesSettings: safeJsonParse(settings.favouritesSettings, {}, 'favouritesSettings'),
      myBestSettings: safeJsonParse(settings.myBestSettings, {}, 'myBestSettings'),
      adminSettings: safeJsonParse(settings.adminSettings, {}, 'adminSettings'),
      workoutPreferences: safeJsonParse(settings.workoutPreferences, {}, 'workoutPreferences'),
      socialSettings: safeJsonParse(settings.socialSettings, {}, 'socialSettings'),
      notificationSettings: safeJsonParse(settings.notificationSettings, {}, 'notificationSettings'),
      weeklyStructureV1:
        settings.weeklyStructureV1?.trim?.()
          ? safeJsonParse(settings.weeklyStructureV1, null, 'weeklyStructureV1')
          : null
    };

    const fromUser = (await getUserYoutubeChannelUrl(dbUserId))?.trim() || '';
    const socialObj = response.socialSettings as Record<string, unknown> | null;
    const legacy =
      socialObj &&
      typeof socialObj[YOUTUBE_CHANNEL_URL_KEY] === 'string' &&
      String(socialObj[YOUTUBE_CHANNEL_URL_KEY]).trim()
        ? String(socialObj[YOUTUBE_CHANNEL_URL_KEY]).trim()
        : '';
    return NextResponse.json({
      ...response,
      youtubeChannelUrl: fromUser || legacy || null
    });
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
      details: errorMessage
    }, { status: 500 });
  }
}

// POST/PUT - Save user settings
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    
    // Handle fallback admin - accept but don't save to database
    if (userId === 'admin') {
      const body = await request.json();
      return NextResponse.json({
        ...body,
        userId: 'admin',
        message: 'Admin settings accepted (not persisted to database)'
      });
    }

    await prismaConnect();
    await ensureUserSettingsColumns();

    const dbUserId = await resolveWorkoutDatabaseUserId(userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();

    if (Object.prototype.hasOwnProperty.call(body, 'youtubeChannelUrl')) {
      const v = body.youtubeChannelUrl;
      await setUserYoutubeChannelUrl(
        dbUserId,
        v === null || v === undefined || String(v).trim() === ''
          ? null
          : String(v).trim()
      );
      delete body.youtubeChannelUrl;
    }
    
    // Convert all JSON objects to strings for database storage
    const jsonFields = [
      'colorSettings', 
      'widgetArrangement', 
      'toolsSettings',
      'favouritesSettings',
      'myBestSettings',
      'adminSettings',
      'workoutPreferences',
      'socialSettings',
      'notificationSettings',
      'weeklyStructureV1'
    ];
    
    const settingsData: any = { ...body };
    
    jsonFields.forEach(field => {
      if (body[field] !== undefined) {
        const v = body[field];
        if (v === null) {
          settingsData[field] = null;
        } else if (typeof v === 'object') {
          settingsData[field] = JSON.stringify(v);
        } else {
          settingsData[field] = v;
        }
      }
    });

    // Remove fields that shouldn't be updated
    delete settingsData.id;
    delete settingsData.userId;
    delete settingsData.createdAt;
    delete settingsData.updatedAt;

    // Ensure all required fields have default values for creation
    const defaultSettings = {
      colorSettings: '{}',
      toolsSettings: '{}',
      favouritesSettings: '{}',
      myBestSettings: '{}',
      adminSettings: '{}',
      workoutPreferences: '{}',
      socialSettings: '{}',
      notificationSettings: '{}',
      widgetArrangement: '[]'
    };

    // Upsert (update or create)
    const settings = await prisma.userSettings.upsert({
      where: { userId: dbUserId },
      update: settingsData,
      create: {
        userId: dbUserId,
        ...defaultSettings,
        ...settingsData // Override defaults with any provided settings
      }
    });

    // Safely parse all JSON fields for response
    const safeJsonParse = (jsonString: string, defaultValue: any, fieldName: string) => {
      try {
        if (!jsonString || jsonString.trim() === '') {
          return defaultValue;
        }
        return JSON.parse(jsonString);
      } catch (error) {
        console.error(`Error parsing ${fieldName}:`, error);
        console.error(`Corrupted JSON for ${fieldName}:`, jsonString?.substring(0, 200));
        return defaultValue;
      }
    };

    const response = {
      ...settings,
      colorSettings: safeJsonParse(settings.colorSettings, {}, 'colorSettings'),
      widgetArrangement: safeJsonParse(settings.widgetArrangement, [], 'widgetArrangement'),
      toolsSettings: safeJsonParse(settings.toolsSettings, {}, 'toolsSettings'),
      favouritesSettings: safeJsonParse(settings.favouritesSettings, {}, 'favouritesSettings'),
      myBestSettings: safeJsonParse(settings.myBestSettings, {}, 'myBestSettings'),
      adminSettings: safeJsonParse(settings.adminSettings, {}, 'adminSettings'),
      workoutPreferences: safeJsonParse(settings.workoutPreferences, {}, 'workoutPreferences'),
      socialSettings: safeJsonParse(settings.socialSettings, {}, 'socialSettings'),
      notificationSettings: safeJsonParse(settings.notificationSettings, {}, 'notificationSettings'),
      weeklyStructureV1:
        settings.weeklyStructureV1?.trim?.()
          ? safeJsonParse(settings.weeklyStructureV1, null, 'weeklyStructureV1')
          : null
    };

    const ytPost = await getUserYoutubeChannelUrl(dbUserId);
    return NextResponse.json({
      ...response,
      youtubeChannelUrl: ytPost ?? null
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to save settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Partial update of settings
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    
    // Handle fallback admin - accept but don't save to database
    if (userId === 'admin') {
      const body = await request.json();
      return NextResponse.json({
        ...body,
        userId: 'admin',
        message: 'Admin settings accepted (not persisted to database)'
      });
    }

    await prismaConnect();
    await ensureUserSettingsColumns();

    const dbUserId = await resolveWorkoutDatabaseUserId(userId);
    if (!dbUserId) {
      console.error(`❌ No User row for token userId ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();

    if (Object.prototype.hasOwnProperty.call(body, 'youtubeChannelUrl')) {
      const v = body.youtubeChannelUrl;
      await setUserYoutubeChannelUrl(
        dbUserId,
        v === null || v === undefined || String(v).trim() === ''
          ? null
          : String(v).trim()
      );
      delete body.youtubeChannelUrl;
    }
    
    // Convert objects to JSON strings for database
    const jsonFields = [
      'colorSettings',
      'widgetArrangement',
      'toolsSettings',
      'favouritesSettings',
      'myBestSettings',
      'adminSettings',
      'workoutPreferences',
      'socialSettings',
      'notificationSettings',
      'weeklyStructureV1'
    ];
    
    const updateData: any = {};
    
    Object.keys(body).forEach(key => {
      if (jsonFields.includes(key)) {
        const v = body[key];
        if (v === null || v === undefined) {
          updateData[key] = null;
        } else if (typeof v === 'object') {
          updateData[key] = JSON.stringify(v);
        } else {
          updateData[key] = v;
        }
      } else if (
        !['id', 'userId', 'createdAt', 'updatedAt', 'youtubeChannelUrl'].includes(key)
      ) {
        updateData[key] = body[key];
      }
    });

    let settings;
    try {
      if (Object.keys(updateData).length > 0) {
        settings = await prisma.userSettings.upsert({
          where: { userId: dbUserId },
          update: updateData,
          create: {
            userId: dbUserId,
            colorSettings: '{}',
            widgetArrangement: '[]',
            toolsSettings: '{}',
            favouritesSettings: '{}',
            myBestSettings: '{}',
            adminSettings: '{}',
            workoutPreferences: '{}',
            socialSettings: '{}',
            notificationSettings: '{}',
            ...updateData
          }
        });
      } else {
        settings = await prisma.userSettings.findUnique({
          where: { userId: dbUserId }
        });
        if (!settings) {
          return NextResponse.json(
            { error: 'User settings not initialized' },
            { status: 404 }
          );
        }
      }
    } catch (dbError) {
      console.error('❌ Database error during upsert, attempting to fix corrupted data:', dbError);
      
      // If upsert fails (likely due to corrupted JSON), delete and recreate
      try {
        await prisma.userSettings.deleteMany({
          where: { userId: dbUserId }
        });
        
        console.log('🔧 Deleted corrupted settings, creating fresh ones...');
        
        settings = await prisma.userSettings.create({
          data: {
            userId: dbUserId,
            colorSettings: '{}',
            widgetArrangement: '[]',
            toolsSettings: '{}',
            favouritesSettings: '{}',
            myBestSettings: '{}',
            adminSettings: '{}',
            workoutPreferences: '{}',
            socialSettings: '{}',
            notificationSettings: '{}',
            ...updateData
          }
        });
        
        console.log('✅ Successfully recreated settings with clean data');
      } catch (recreateError) {
        console.error('❌ Failed to recreate settings:', recreateError);
        throw new Error('Failed to fix corrupted settings data');
      }
    }

    // Parse all JSON fields for response (using safeJsonParse to handle corrupted data)
    const response = {
      ...settings,
      colorSettings: safeJsonParse(settings.colorSettings, {}),
      widgetArrangement: safeJsonParse(settings.widgetArrangement, []),
      toolsSettings: safeJsonParse(settings.toolsSettings, {}),
      favouritesSettings: safeJsonParse(settings.favouritesSettings, {}),
      myBestSettings: safeJsonParse(settings.myBestSettings, {}),
      adminSettings: safeJsonParse(settings.adminSettings, {}),
      workoutPreferences: safeJsonParse(settings.workoutPreferences, {}),
      socialSettings: safeJsonParse(settings.socialSettings, {}),
      notificationSettings: safeJsonParse(settings.notificationSettings, {}),
      weeklyStructureV1:
        settings.weeklyStructureV1?.trim?.()
          ? safeJsonParse(settings.weeklyStructureV1, null)
          : null
    };

    const ytRow = await getUserYoutubeChannelUrl(dbUserId);
    return NextResponse.json({
      ...response,
      youtubeChannelUrl: ytRow ?? null
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update settings', details: message },
      { status: 500 }
    );
  }
}

