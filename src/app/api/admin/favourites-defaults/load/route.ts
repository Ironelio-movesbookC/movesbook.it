import { NextRequest, NextResponse} from 'next/server';
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
    const defaults = await prisma.favouritesDefaults.findUnique({
      where: { language }
    });

    if (defaults) {
      console.log(`✅ Loaded favourites defaults from database for language: ${language}`);

      return NextResponse.json({
        success: true,
        favouritesData: defaults.data,
        language
      });
    } else {
      console.log(`ℹ️ No defaults found in database for language: ${language}`);
      
      return NextResponse.json({
        success: false,
        error: 'No defaults found for this language',
        favouritesData: null
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error loading favourites defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
