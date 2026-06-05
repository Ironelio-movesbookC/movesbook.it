import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// PATCH /api/nutrition/sessions/[id] - Update a workout session
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for Next.js compatibility
    const params = context.params instanceof Promise ? await context.params : context.params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      time,
      location,
      surface,
      notes,
      weather,
      heartRateMax,
      heartRateAvg,
      calories,
      feelingStatus,
      status,
      sports,
      mainSport,
      mainGoal,
      intensity,
      tags,
      includeStretching
    } = body;

    console.log('📝 Updating workout session:', params.id, body);

    // First verify user ownership through day
    const existingSession = await prisma.nutritionMeal.findUnique({
      where: { id: params.id },
      include: {
        nutritionDay: {
          select: { userId: true }
        }
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    if (existingSession.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout session' }, { status: 403 });
    }

    // Update workout session
    const session = await prisma.nutritionMeal.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        code: code || undefined,
        time: time || undefined,
        location: location || undefined,
        surface: surface || undefined,
        notes: notes || undefined,
        weather: weather || undefined,
        heartRateMax: heartRateMax ? parseInt(heartRateMax) : undefined,
        heartRateAvg: heartRateAvg ? parseInt(heartRateAvg) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        feelingStatus: feelingStatus || undefined,
        status: status as any || undefined,
        mainSport: mainSport !== undefined ? (mainSport || null) : undefined,
        mainGoal: mainGoal !== undefined ? (mainGoal || null) : undefined,
        intensity: intensity !== undefined ? (intensity || null) : undefined,
        tags: tags !== undefined ? (tags || null) : undefined,
        includeStretching: includeStretching !== undefined ? includeStretching : undefined
      },
      include: {
        sports: true,
        nutritionFoods: {
          include: {
            nutritionComponents: {
              orderBy: { repetitionNumber: 'asc' }
            },
            section: true
          },
          orderBy: { letter: 'asc' }
        }
      }
    });

    // Update sports if provided
    if (sports && Array.isArray(sports)) {
      // Delete existing sports
      await prisma.nutritionMealSport.deleteMany({
        where: { nutritionMealId: params.id }
      });

      // Add new sports
      for (const sportItem of sports) {
        if (sportItem) {
          // Extract the sport type - handle both object and string formats
          const sportType = typeof sportItem === 'object' && sportItem.sport 
            ? sportItem.sport 
            : sportItem;
          
          await prisma.nutritionMealSport.create({
            data: {
              nutritionMealId: params.id,
              sport: sportType
            }
          });
        }
      }
    }

    console.log('✅ NutritionMeal session updated:', session.id);

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('❌ Error updating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to update workout session', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/nutrition/sessions/[id] - Delete a workout session
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for Next.js compatibility
    const params = context.params instanceof Promise ? await context.params : context.params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🗑️ Deleting workout session:', params.id);

    // First verify user ownership through day
    const existingSession = await prisma.nutritionMeal.findUnique({
      where: { id: params.id },
      include: {
        nutritionDay: {
          select: { userId: true }
        }
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    if (existingSession.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout session' }, { status: 403 });
    }

    // Delete workout session (cascade will delete nutritionFoods and nutrition_components)
    await prisma.nutritionMeal.delete({
      where: { id: params.id }
    });

    console.log('✅ NutritionMeal session deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting workout session:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout session', details: error.message },
      { status: 500 }
    );
  }
}
