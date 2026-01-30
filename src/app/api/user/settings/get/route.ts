import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: decoded.userId }
    });

    if (!userSettings) {
      return NextResponse.json({
        success: true,
        settings: null,
        message: 'No settings found for user'
      });
    }

    // Parse JSON settings
    const settings = {
      colorSettings: JSON.parse(userSettings.colorSettings || '{}'),
      toolsSettings: JSON.parse(userSettings.toolsSettings || '{}'),
      favouritesSettings: JSON.parse(userSettings.favouritesSettings || '{}'),
      myBestSettings: JSON.parse(userSettings.myBestSettings || '{}'),
      workoutPreferences: JSON.parse(userSettings.workoutPreferences || '{}'),
      displaySettings: {
        gridSize: userSettings.gridSize,
        columnCount: userSettings.columnCount,
        rowHeight: userSettings.rowHeight,
        defaultView: userSettings.defaultView,
        leftSidebarVisible: userSettings.leftSidebarVisible,
        rightSidebarVisible: userSettings.rightSidebarVisible,
        leftSidebarWidth: userSettings.leftSidebarWidth,
        rightSidebarWidth: userSettings.rightSidebarWidth,
        theme: userSettings.theme,
        fontSize: userSettings.fontSize,
        sportIconType: userSettings.sportIconType
      }
    };

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error('Error getting user settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get settings',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

