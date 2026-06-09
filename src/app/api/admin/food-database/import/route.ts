import { NextRequest, NextResponse } from 'next/server';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { importFoodDatabase } from '@/lib/foodDatabaseImport';
import type { FoodDatabaseImportPayload } from '@/lib/foodDatabase.types';
import bundledImport from '@/data/foodDatabaseImport.json';

export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source as 'bundled' | 'upload' | undefined;

    let payload: FoodDatabaseImportPayload;

    if (source === 'bundled' || !body.data) {
      payload = bundledImport as FoodDatabaseImportPayload;
      if (body.replaceExisting) payload.replaceExisting = true;
    } else {
      payload = body.data as FoodDatabaseImportPayload;
      if (body.replaceExisting) payload.replaceExisting = true;
    }

    const result = await importFoodDatabase(payload);

    return NextResponse.json({
      success: true,
      message: 'Food database imported successfully',
      result,
    });
  } catch (e) {
    console.error('food-database import POST:', e);
    return NextResponse.json(
      { error: 'Import failed', details: (e as Error).message },
      { status: 500 }
    );
  }
}
