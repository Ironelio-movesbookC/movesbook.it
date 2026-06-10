import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(request: NextRequest) {
  try {
    const { language, toolsData, password } = await request.json();

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
    if (!language || !toolsData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert toolsData to JSON string for storage
    const dataString = JSON.stringify(toolsData);
    
    // Save to Prisma database using upsert (create or update)
    await prisma.toolsDefaults.upsert({
      where: { language },
      update: {
        data: dataString,
        updatedAt: new Date()
      },
      create: {
        language,
        data: dataString
      }
    });

    console.log(`✅ Saved tools defaults to database for language: ${language}`);

    return NextResponse.json({
      success: true,
      message: `Tools defaults saved for ${language}`
    });

  } catch (error) {
    console.error('❌ Error saving tools defaults:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
