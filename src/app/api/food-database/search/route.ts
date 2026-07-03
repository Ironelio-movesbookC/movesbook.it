import { NextRequest, NextResponse } from 'next/server';
import {
  getFoodDatabaseSource,
  isLiveFoodDatabaseSource,
  type FoodDatabaseSourceId,
} from '@/constants/foodDatabaseSources';
import { searchLiveFoodDatabase } from '@/lib/foodDatabaseConnectors/liveSearch';
import { getFoodDatabaseSourceState } from '@/lib/foodDatabaseSourceState';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const sourceParam = searchParams.get('source');
  const page = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const pageSize = Math.min(
    Number.parseInt(searchParams.get('pageSize') || '25', 10) || 25,
    50
  );

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [], total: 0, query: q });
  }

  try {
    const state = await getFoodDatabaseSourceState();
    const sourceId = (sourceParam || state.activeSourceId) as FoodDatabaseSourceId;
    const source = getFoodDatabaseSource(sourceId);

    if (!source || !isLiveFoodDatabaseSource(sourceId)) {
      return NextResponse.json(
        { error: 'Active source does not support live search', sourceId },
        { status: 400 }
      );
    }

    const { items, total } = await searchLiveFoodDatabase(sourceId, q, { page, pageSize });

    return NextResponse.json({
      items,
      total,
      query: q,
      sourceId,
      accessMode: 'live',
    });
  } catch (e) {
    console.error('food-database search GET:', e);
    return NextResponse.json(
      { error: 'Search failed', details: (e as Error).message },
      { status: 500 }
    );
  }
}
