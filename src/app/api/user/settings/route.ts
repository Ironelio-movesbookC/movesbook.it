import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma, prismaConnect, resetPrismaClient } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function isPrismaEngineTransportError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientUnknownRequestError)) return false;
  const msg = error.message;
  return msg.includes('Engine was empty') || msg.includes('Engine is not yet connected');
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
        language: 'en'
      });
    }

    await prismaConnect();

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      console.error(`❌ User ${userId} not found in database`);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    let settings;
    try {
      settings = await prisma.userSettings.findUnique({
        where: { userId }
      });
    } catch (dbError) {
      if (isPrismaEngineTransportError(dbError)) {
        console.warn('⚠️ Prisma engine failed while reading settings; resetting client and retrying once');
        await resetPrismaClient();
        await prismaConnect();
        try {
          settings = await prisma.userSettings.findUnique({
            where: { userId }
          });
        } catch {
          settings = null;
        }
      } else {
        console.error('❌ Database error reading settings (will try to recreate):', dbError);
        try {
          await prisma.userSettings.deleteMany({
            where: { userId }
          });
          console.log('🔧 Deleted settings row after read error');
        } catch (deleteError) {
          console.error('Error deleting settings:', deleteError);
        }
        settings = null;
      }
    }

    // If no settings exist, create default settings with admin defaults
    if (!settings) {
      // Load admin defaults for user's language (default to 'en')
      const userLanguage = 'en';
      console.log(`No settings found for user ${userId}, loading admin defaults for language: ${userLanguage}`);

      const [colorDefaults, toolsDefaults, favouritesDefaults] = await Promise.all([
        prisma.colorDefaults.findUnique({ where: { language: userLanguage } }),
        prisma.toolsDefaults.findUnique({ where: { language: userLanguage } }),
        prisma.favouritesDefaults.findUnique({ where: { language: userLanguage } })
      ]);

      settings = await prisma.userSettings.create({
        data: {
          userId,
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
      notificationSettings: safeJsonParse(settings.notificationSettings, {}, 'notificationSettings')
    };

    return NextResponse.json(response);
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

    const body = await request.json();
    
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
      'notificationSettings'
    ];
    
    const settingsData: any = { ...body };
    
    jsonFields.forEach(field => {
      if (body[field] !== undefined) {
        settingsData[field] = typeof body[field] === 'object' 
          ? JSON.stringify(body[field])
          : body[field];
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
      where: { userId },
      update: settingsData,
      create: {
        userId,
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
      notificationSettings: safeJsonParse(settings.notificationSettings, {}, 'notificationSettings')
    };

    return NextResponse.json(response);
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

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      console.error(`❌ User ${userId} not found in database`);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    
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
      'notificationSettings'
    ];
    
    const updateData: any = {};
    
    Object.keys(body).forEach(key => {
      if (jsonFields.includes(key)) {
        updateData[key] = typeof body[key] === 'object' 
          ? JSON.stringify(body[key]) 
          : body[key];
      } else if (!['id', 'userId', 'createdAt', 'updatedAt'].includes(key)) {
        updateData[key] = body[key];
      }
    });

    let settings;
    try {
      settings = await prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
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
    } catch (dbError) {
      console.error('❌ Database error during upsert, attempting to fix corrupted data:', dbError);
      
      // If upsert fails (likely due to corrupted JSON), delete and recreate
      try {
        await prisma.userSettings.deleteMany({
          where: { userId }
        });
        
        console.log('🔧 Deleted corrupted settings, creating fresh ones...');
        
        settings = await prisma.userSettings.create({
          data: {
            userId,
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
      notificationSettings: safeJsonParse(settings.notificationSettings, {})
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

