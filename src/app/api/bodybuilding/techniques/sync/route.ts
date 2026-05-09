import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/bodybuilding/techniques/sync
 * Bulk sync body building techniques (create/update/delete)
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

    const { techniques } = await request.json();

    console.log(`💾 Syncing ${techniques?.length || 0} execution techniques for user:`, decoded.userId);
    console.log('📋 Techniques with order:', techniques.map((t: any, index: number) => ({ 
      index,
      name: t.title || t.name, 
      order: t.order,
      sports: t.sports,
      userId: t.userId
    })));
    console.log('📋 Raw techniques data:', JSON.stringify(techniques, null, 2));

    if (!techniques || !Array.isArray(techniques)) {
      return NextResponse.json(
        { error: 'Techniques array is required' },
        { status: 400 }
      );
    }

    // Filter to only user-created techniques (exclude admin techniques)
    const userTechniques = techniques.filter((t: any) => {
      // Check if this technique belongs to the current user
      // If userId is missing or equals current user, include it
      return !t.userId || t.userId === decoded.userId;
    });
    
    console.log(`📝 Filtered ${userTechniques.length} user techniques from ${techniques.length} total`);
    
    // Only delete and recreate if there are techniques to save
    // This prevents accidentally deleting everything with an empty array
    if (userTechniques.length === 0) {
      console.log('⚠️ Empty user techniques array - not deleting existing techniques');
      const existing = await prisma.executionTechnique.findMany({
        where: { userId: decoded.userId }
      });
      return NextResponse.json({ techniques: existing });
    }

    // Delete existing techniques for this user ONLY
    await prisma.executionTechnique.deleteMany({
      where: {
        userId: decoded.userId,
      },
    });

    // Create new techniques (only user's techniques)
    const createdTechniques = [];
    for (let i = 0; i < userTechniques.length; i++) {
      const technique = userTechniques[i];
      // Convert sports array to comma-separated string
      const sportsString = Array.isArray(technique.sports) ? technique.sports.join(',') : '';
      console.log(`  📝 Saving technique: ${technique.title || technique.name} | Sports: ${sportsString} | Order: ${technique.order !== undefined ? technique.order : i}`);
      
      const created = await prisma.executionTechnique.create({
        data: {
          userId: decoded.userId,
          name: technique.title || technique.name,
          description: technique.description || '',
          color: technique.color,
          sports: sportsString,
          displayOrder: technique.order !== undefined ? technique.order : i, // Use order from client or index
        },
      });
      createdTechniques.push(created);
    }

    return NextResponse.json({ techniques: createdTechniques });
  } catch (error) {
    console.error('Error syncing body building techniques:', error);
    return NextResponse.json(
      { error: 'Failed to sync techniques', details: (error as Error).message },
      { status: 500 }
    );
  }
}

