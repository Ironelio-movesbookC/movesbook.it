import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/workouts/moveframes/[id] - Get a single moveframe with movelaps
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch moveframe with movelaps
    const moveframe = await prisma.moveframe.findUnique({
      where: { id: params.id },
      include: {
        movelaps: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true,
        workoutSession: {
          include: {
            workoutDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!moveframe) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    // Verify ownership
    if (moveframe.workoutSession.workoutDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your moveframe' }, { status: 403 });
    }

    return NextResponse.json(moveframe);
  } catch (error: any) {
    console.error('❌ Error fetching moveframe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moveframe', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/workouts/moveframes/[id] - Update a moveframe
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const {
      letter,
      sport,
      sectionId,
      type,
      description,
      notes,
      macroFinal,
      alarm,
      annotationText,
      annotationBgColor,
      annotationTextColor,
      annotationBold,
      manualMode,
      manualPriority,    // Priority flag for manual mode display
      manualInputType,   // For aerobic sports: 'meters' or 'time'
      favourite,
      manualRepetitions, // For storing on Moveframe model (manual mode only)
      manualDistance,    // For storing on Moveframe model (manual mode only)
      appliedTechnique,  // Body Building technique
      aerobicSeries      // Series/Batteries/Groups for aerobic sports
    } = body;

    console.log('📝 [API UPDATE] Updating moveframe:', params.id, {
      ...body,
      manualPriority: body.manualPriority
    });

    // First verify user ownership through workout session -> day
    const existingMoveframe = await prisma.moveframe.findUnique({
      where: { id: params.id },
      include: {
        workoutSession: {
          include: {
            workoutDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingMoveframe) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    if (existingMoveframe.workoutSession.workoutDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your moveframe' }, { status: 403 });
    }

    // Log update data for debugging
    console.log('📝 Updating moveframe with data:', {
      descriptionLength: description?.length || 0,
      notesLength: notes?.length || 0,
      descriptionPreview: description?.substring(0, 200) || '',
      notesPreview: notes?.substring(0, 200) || '',
      manualMode: manualMode
    });

    // 🔍 DEBUG: Log what's being updated
    console.log('📥 [API UPDATE] Received update request with:', {
      sport,
      manualMode,
      manualPriority,
      manualInputType: `"${manualInputType}"`,
      manualInputTypeType: typeof manualInputType,
      manualRepetitions,
      manualDistance
    });
    
    if (manualMode) {
      console.log('🔍 [API PATCH] Manual mode moveframe update:');
      console.log('   manualRepetitions (raw):', manualRepetitions);
      console.log('   manualDistance (raw):', manualDistance);
      console.log('   manualInputType (raw):', `"${manualInputType}"`);
    }

    // Update moveframe
    const moveframe = await prisma.moveframe.update({
      where: { id: params.id },
      data: {
        letter: letter || undefined,
        sport: sport || undefined,
        sectionId: sectionId || undefined,
        type: type as any || undefined,
        description: description || undefined,
        notes: notes !== undefined ? notes : undefined,
        macroFinal: macroFinal !== undefined ? macroFinal : undefined,
        alarm: alarm !== undefined ? (alarm ? parseInt(alarm) : null) : undefined,
        manualMode: manualMode !== undefined ? manualMode : undefined,
        manualPriority: manualPriority !== undefined ? manualPriority : undefined,
        manualInputType: manualInputType !== undefined ? manualInputType : undefined,
        favourite: favourite !== undefined ? favourite : undefined,
        repetitions: manualRepetitions !== undefined && manualRepetitions !== null && manualRepetitions !== '' ? parseInt(manualRepetitions) : (manualRepetitions === null || manualRepetitions === '' ? null : undefined),
        distance: manualDistance !== undefined && manualDistance !== null && manualDistance !== '' ? parseInt(manualDistance) : (manualDistance === null || manualDistance === '' ? null : undefined),
        appliedTechnique: appliedTechnique !== undefined ? appliedTechnique : undefined,
        aerobicSeries: aerobicSeries !== undefined && aerobicSeries !== null && aerobicSeries !== '' ? parseInt(aerobicSeries) : (aerobicSeries === null || aerobicSeries === '' ? null : undefined),
        // Annotation fields: only save if type is ANNOTATION, otherwise clear them
        annotationText: type === 'ANNOTATION' ? (annotationText || null) : null,
        annotationBgColor: type === 'ANNOTATION' ? (annotationBgColor || null) : null,
        annotationTextColor: type === 'ANNOTATION' ? (annotationTextColor || null) : null,
        annotationBold: type === 'ANNOTATION' ? (annotationBold || false) : false
      },
      include: {
        movelaps: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true
      }
    });

    // If appliedTechnique changed, update all movelap notes
    if (appliedTechnique !== undefined && appliedTechnique !== existingMoveframe.appliedTechnique) {
      const movelaps = await prisma.movelap.findMany({
        where: { moveframeId: params.id }
      });

      for (const movelap of movelaps) {
        let updatedNotes = movelap.notes || '';
        
        // Remove old technique if it exists
        if (existingMoveframe.appliedTechnique) {
          const oldTechniquePattern = new RegExp(`\\n?\\n?Technique: ${existingMoveframe.appliedTechnique}`, 'g');
          updatedNotes = updatedNotes.replace(oldTechniquePattern, '').trim();
        }
        
        // Add new technique if provided
        if (appliedTechnique) {
          updatedNotes = updatedNotes 
            ? `${updatedNotes}\n\nTechnique: ${appliedTechnique}`
            : `Technique: ${appliedTechnique}`;
        }
        
        await prisma.movelap.update({
          where: { id: movelap.id },
          data: { notes: updatedNotes || null }
        });
      }
      
      console.log(`✅ Updated ${movelaps.length} movelap notes with technique: ${appliedTechnique || '(removed)'}`);
    }

    // 🔍 DEBUG: Log what was saved
    if (manualMode || moveframe.manualMode) {
      console.log('✅ [API PATCH] Moveframe updated and returned:');
      console.log('   ID:', moveframe.id);
      console.log('   repetitions (stored on Moveframe):', moveframe.repetitions);
      console.log('   distance (stored on Moveframe):', moveframe.distance);
    }

    console.log('✅ Moveframe updated:', {
      id: moveframe.id,
      manualMode: moveframe.manualMode,
      manualPriority: moveframe.manualPriority,
      manualPriorityType: typeof moveframe.manualPriority
    });

    return NextResponse.json(moveframe);
  } catch (error: any) {
    console.error('❌ Error updating moveframe:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return NextResponse.json(
      { 
        error: 'Failed to update moveframe', 
        details: error.message,
        errorName: error.name,
        errorCode: error.code
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/moveframes/[id] - Delete a moveframe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    console.log('🗑️ Deleting moveframe:', params.id);

    // First verify user ownership through workout session -> day
    const existingMoveframe = await prisma.moveframe.findUnique({
      where: { id: params.id },
      include: {
        workoutSession: {
          include: {
            workoutDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingMoveframe) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    if (existingMoveframe.workoutSession.workoutDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your moveframe' }, { status: 403 });
    }

    // Delete moveframe (cascade will delete movelaps)
    await prisma.moveframe.delete({
      where: { id: params.id }
    });

    console.log('✅ Moveframe deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting moveframe:', error);
    return NextResponse.json(
      { error: 'Failed to delete moveframe', details: error.message },
      { status: 500 }
    );
  }
}
