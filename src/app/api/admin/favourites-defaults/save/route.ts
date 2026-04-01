import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(request: NextRequest) {
  try {
    const { language, favouritesData, password } = await request.json();

    // Verify password against database
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/admin/super-admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid Super Admin password' },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!language || !favouritesData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to Prisma database using upsert (create or update)
    await prisma.favouritesDefaults.upsert({
      where: { language },
      update: {
        data: favouritesData,
        updatedAt: new Date()
      },
      create: {
        language,
        data: favouritesData
      }
    });

    console.log(`✅ Saved favourites defaults to database for language: ${language}`);

    return NextResponse.json({
      success: true,
      message: `Favourites defaults saved for ${language}`
    });

  } catch (error) {
    console.error('Error saving favourites defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
