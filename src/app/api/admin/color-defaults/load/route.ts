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
    const defaults = await prisma.colorDefaults.findUnique({
      where: { language }
    });

    if (defaults) {
      console.log(`✅ Loaded color defaults from database for language: ${language}`);

      return NextResponse.json({
        success: true,
        colors: defaults.data,
        language
      });
    } else {
      console.log(`ℹ️ No defaults found in database for language: ${language}`);
      
      return NextResponse.json({
        success: false,
        error: 'No defaults found for this language',
        colors: null
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error loading color defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
