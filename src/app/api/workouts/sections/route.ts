import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/workouts/sections
 * Get all workout sections for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Handle fallback admin (userId === 'admin') - skip user existence check
    if (decoded.userId === 'admin') {
      return NextResponse.json({ sections: [] });
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

    // Get all sections for this user
    const sections = await prisma.workoutSection.findMany({
      where: { userId: decoded.userId },
      orderBy: { displayOrder: 'asc' }
    });

    // If user has no sections, create default ones
    if (sections.length === 0) {
      const defaultSections = await prisma.$transaction([
        prisma.workoutSection.create({
          data: {
            userId: decoded.userId,
            name: 'Warm-up',
            description: 'Warm-up exercises',
            color: '#FEF3C7' // Yellow
          }
        }),
        prisma.workoutSection.create({
          data: {
            userId: decoded.userId,
            name: 'Main Set',
            description: 'Main workout exercises',
            color: '#DBEAFE' // Blue
          }
        }),
        prisma.workoutSection.create({
          data: {
            userId: decoded.userId,
            name: 'Cool-down',
            description: 'Cool-down exercises',
            color: '#D1FAE5' // Green
          }
        })
      ]);

      return NextResponse.json({ sections: defaultSections });
    }

    return NextResponse.json({ sections });

  } catch (error) {
    console.error('❌ Error fetching sections:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error('❌ Error details:', { 
      message: errorMessage, 
      stack: errorStack, 
      name: errorName,
      type: typeof error
    });
    return NextResponse.json(
      { error: 'Failed to fetch sections', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workouts/sections
 * Create a new workout section
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Handle fallback admin (userId === 'admin') - not allowed to create sections
    if (decoded.userId === 'admin') {
      return NextResponse.json({ error: 'Fallback admin cannot create sections. Please use a real user account.' }, { status: 403 });
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

    const body = await request.json();
    const { name, code, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const section = await prisma.workoutSection.create({
      data: {
        userId: decoded.userId,
        name,
        code: code || null, // Short code for compact display
        description: description || '',
        color: color || '#E5E7EB' // Gray default
      }
    });

    return NextResponse.json({ section }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating section:', error);
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: 'Unknown error', error: String(error) };
    console.error('❌ Error details:', JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      { error: 'Failed to create section', details: errorDetails },
      { status: 500 }
    );
  }
}
