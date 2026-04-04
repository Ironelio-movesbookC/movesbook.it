import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Safely parse JSON with error handling
    let periods;
    try {
      const body = await request.json();
      periods = body.periods;
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: parseError instanceof Error ? parseError.message : 'Unable to parse JSON'
      }, { status: 400 });
    }
    
    // Handle fallback admin - accept but don't save
    if (decoded.userId === 'admin') {
      return NextResponse.json({
        success: true,
        periods: periods || [],
        message: 'Admin periods accepted (not persisted to database)'
      });
    }

    if (!Array.isArray(periods)) {
      return NextResponse.json({ error: 'Periods must be an array' }, { status: 400 });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true }
    });

    if (!user) {
      console.error(`❌ User ${decoded.userId} not found in database`);
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    console.log(`🔄 Syncing ${periods.length} periods for user ${decoded.userId}`);

    // Get existing periods from database
    const existingPeriods = await prisma.period.findMany({
      where: { userId: decoded.userId }
    });

    const existingIds = new Set(existingPeriods.map(p => p.id));
    const incomingIds = new Set(periods.map((p: any) => p.id).filter((id: string) => id && !id.startsWith('temp_')));

    // 1. Delete periods that are no longer in the incoming list
    const periodsToDelete = existingPeriods.filter(p => !incomingIds.has(p.id));
    if (periodsToDelete.length > 0) {
      await prisma.period.deleteMany({
        where: {
          id: { in: periodsToDelete.map(p => p.id) },
          userId: decoded.userId
        }
      });
      console.log(`🗑️  Deleted ${periodsToDelete.length} periods`);
    }

    // 2. Update or create periods
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const periodBase = {
        userId: decoded.userId,
        name: period.title || period.name, // Support both 'title' and 'name'
        description: (period.description || '').slice(0, 2000),
        color: period.color || '#3b82f6',
        displayOrder: period.order !== undefined ? period.order : i // Use order from client or index
      };

      let translationPatch: { descriptionTranslations?: string | null } = {};
      if (period.descriptionByLanguage !== undefined && period.descriptionByLanguage !== null) {
        const descByLang = period.descriptionByLanguage;
        let descriptionTranslations: string | null = null;
        if (descByLang && typeof descByLang === 'object') {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(descByLang)) {
            if (typeof v === 'string' && v.trim()) cleaned[k] = v.trim().slice(0, 2000);
          }
          if (Object.keys(cleaned).length > 0) descriptionTranslations = JSON.stringify(cleaned);
        }
        translationPatch = { descriptionTranslations };
      }

      const periodData = { ...periodBase, ...translationPatch };

      // If period has an ID and it exists in database, update it
      if (period.id && existingIds.has(period.id)) {
        await prisma.period.update({
          where: { id: period.id },
          data: periodData
        });
        console.log(`✏️  Updated period: ${periodData.name} (order: ${periodData.displayOrder})`);
      } 
      // Otherwise, create a new period
      else {
        await prisma.period.create({
          data: periodData
        });
        console.log(`➕ Created new period: ${periodData.name} (order: ${periodData.displayOrder})`);
      }
    }

    // Fetch updated list
    const updatedPeriods = await prisma.period.findMany({
      where: { userId: decoded.userId },
      orderBy: { displayOrder: 'asc' }
    });

    console.log(`✅ Sync complete. Total periods: ${updatedPeriods.length}`);

    return NextResponse.json({ 
      success: true,
      periods: updatedPeriods 
    });

  } catch (error) {
    console.error('❌ Error syncing periods:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to sync periods', details: errorMessage },
      { status: 500 }
    );
  }
}

