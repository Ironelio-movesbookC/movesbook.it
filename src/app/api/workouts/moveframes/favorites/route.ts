import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all favorite moveframes for the current user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    
    // Fetch all moveframes marked as favorite for this user
    const favoriteMoveframes = await prisma.moveframe.findMany({
      where: {
        favourite: true,
        workoutSession: {
          workoutDay: {
            userId
          }
        }
      },
      include: {
        movelaps: {
          orderBy: { repetitionNumber: 'asc' }
        },
        workoutSession: {
          select: {
            name: true,
            sessionNumber: true,
            workoutDay: {
              select: {
                date: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data for the settings page
    const formattedMoveframes = favoriteMoveframes.map(mf => {
      let totalDistance = 0;
      let totalDuration = 0;
      
      mf.movelaps.forEach(ml => {
        totalDistance += ml.distance || 0;
        totalDuration += Number(ml.time) || 0;
      });
      
      return {
        id: mf.id,
        name: mf.description || `Moveframe ${mf.letter}`,
        description: mf.notes || '',
        sport: mf.sport,
        type: mf.type,
        letter: mf.letter,
        lapsCount: mf.movelaps.length,
        totalDistance,
        totalDuration,
        workoutName: mf.workoutSession.name,
        workoutNumber: mf.workoutSession.sessionNumber,
        lastUsed: mf.workoutSession.workoutDay?.date || mf.createdAt,
        createdAt: mf.createdAt,
        moveframeData: {
          letter: mf.letter,
          sport: mf.sport,
          type: mf.type,
          description: mf.description,
          notes: mf.notes,
          macroFinal: mf.macroFinal,
          alarm: mf.alarm,
          workType: mf.workType,
          movelaps: mf.movelaps.map(ml => ({
            repetitionNumber: ml.repetitionNumber,
            distance: ml.distance,
            speed: ml.speed,
            style: ml.style,
            pace: ml.pace,
            time: ml.time,
            reps: ml.reps,
            r1: ml.r1,
            r2: ml.r2,
            muscularSector: ml.muscularSector,
            exercise: ml.exercise,
            restType: ml.restType,
            pause: ml.pause,
            notes: ml.notes
          }))
        }
      };
    });
    
    return NextResponse.json({ moveframes: formattedMoveframes }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching favorite moveframes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite moveframes', details: error.message },
      { status: 500 }
    );
  }
}

