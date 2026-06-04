import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';

export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, GIF, or WebP images are allowed' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `food_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${fileExtension}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'food-database');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(join(uploadDir, fileName), buffer);

    return NextResponse.json({
      success: true,
      path: `/uploads/food-database/${fileName}`,
      fileName,
    });
  } catch (error: unknown) {
    console.error('food-database upload:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: 'Failed to upload image', details: message }, { status: 500 });
  }
}
