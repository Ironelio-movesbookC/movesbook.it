import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/bodybuilding/techniques
 * Fetch execution techniques from Super Admin (ADMIN users) + current user's own techniques
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, userType: true, email: true }
    });
    console.log(`👤 Current user: ${currentUser?.email} (ID: ${decoded.userId}, Type: ${currentUser?.userType})`);
    
    // Get all ADMIN users (Super Admins)
    const adminUsers = await prisma.user.findMany({
      where: { userType: 'ADMIN' },
      select: { id: true, email: true }
    });
    
    const adminUserIds = adminUsers.map(admin => admin.id);
    console.log(`🔍 Found ${adminUsers.length} ADMIN users:`, adminUsers.map(a => a.email));

    // Fetch techniques from Super Admin (ADMIN users) AND current user
    const techniques = await prisma.executionTechnique.findMany({
      where: {
        OR: [
          { userId: { in: adminUserIds } }, // Super Admin techniques
          { userId: decoded.userId },       // User's own techniques
        ],
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    console.log(`✅ Loaded ${techniques.length} execution techniques`);

    // Convert sports string to array for each technique
    const techniquesWithSportsArray = techniques.map(tech => ({
      ...tech,
      sports: tech.sports ? tech.sports.split(',').filter(s => s) : []
    }));

    // Separate Super Admin vs User techniques for logging
    const superAdminTechniques = techniquesWithSportsArray.filter(t => adminUserIds.includes(t.userId));
    const userTechniques = techniquesWithSportsArray.filter(t => t.userId === decoded.userId);
    
    console.log(`📋 Super Admin techniques: ${superAdminTechniques.length}`, superAdminTechniques.map(t => ({ name: t.name, sports: t.sports, userId: t.userId })));
    console.log(`📋 User's own techniques: ${userTechniques.length}`, userTechniques.map(t => ({ name: t.name, sports: t.sports, userId: t.userId })));
    console.log(`📋 All techniques:`, techniquesWithSportsArray.map(t => ({ name: t.name, sports: t.sports, userId: t.userId, isAdmin: adminUserIds.includes(t.userId) })));

    return NextResponse.json({ techniques: techniquesWithSportsArray });
  } catch (error) {
    console.error('Error fetching execution techniques:', error);
    return NextResponse.json(
      { error: 'Failed to fetch techniques', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bodybuilding/techniques
 * Create a new body building technique
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name, description, color, sports } = await request.json();

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Convert sports array to comma-separated string
    const sportsString = Array.isArray(sports) ? sports.join(',') : '';

    const technique = await prisma.executionTechnique.create({
      data: {
        userId: decoded.userId,
        name,
        description: description || '',
        color,
        sports: sportsString,
      },
    });

    return NextResponse.json({ technique }, { status: 201 });
  } catch (error) {
    console.error('Error creating body building technique:', error);
    return NextResponse.json(
      { error: 'Failed to create technique', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bodybuilding/techniques
 * Update an existing body building technique
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id, name, description, color, sports } = await request.json();

    if (!id || !name || !color) {
      return NextResponse.json(
        { error: 'ID, name, and color are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingTechnique = await prisma.executionTechnique.findUnique({
      where: { id },
    });

    if (!existingTechnique || existingTechnique.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Technique not found or unauthorized' },
        { status: 404 }
      );
    }

    // Convert sports array to comma-separated string
    const sportsString = Array.isArray(sports) ? sports.join(',') : '';

    const technique = await prisma.executionTechnique.update({
      where: { id },
      data: {
        name,
        description: description || '',
        color,
        sports: sportsString,
      },
    });

    return NextResponse.json({ technique });
  } catch (error) {
    console.error('Error updating body building technique:', error);
    return NextResponse.json(
      { error: 'Failed to update technique', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bodybuilding/techniques
 * Delete a body building technique
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingTechnique = await prisma.executionTechnique.findUnique({
      where: { id },
    });

    if (!existingTechnique || existingTechnique.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Technique not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.executionTechnique.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting body building technique:', error);
    return NextResponse.json(
      { error: 'Failed to delete technique', details: (error as Error).message },
      { status: 500 }
    );
  }
}

