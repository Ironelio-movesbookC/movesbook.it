import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');

    if (!language) {
      return NextResponse.json(
        { success: false, error: 'Language parameter required' },
        { status: 400 }
      );
    }

    // Load from Prisma database
    const defaults = await prisma.toolsDefaults.findUnique({
      where: { language }
    });

    if (defaults) {
      console.log(`✅ Loaded tools defaults from database for language: ${language}`);
      
      // Parse the JSON string back to object
      const parsedData = JSON.parse(defaults.data);

      return NextResponse.json({
        success: true,
        toolsData: parsedData,
        language
      });
    } else {
      console.log(`ℹ️ No defaults found in database for language: ${language}`);
      
      return NextResponse.json({
        success: false,
        error: 'No defaults found for this language',
        toolsData: null
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error loading tools defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
