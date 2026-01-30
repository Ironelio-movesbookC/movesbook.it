import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/workouts/moveframes/create-with-movelaps
 * Create a moveframe with its movelaps in one transaction
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

    const body = await request.json();
    
    console.log('🚨🚨🚨 [API CREATE] FULL REQUEST BODY:');
    console.log(JSON.stringify(body, null, 2));
    
    const {
      workoutSessionId,
      sectionId,
      letter,
      sport,
      type,
      description,
      notes,
      movelaps,
      annotationText,
      annotationBgColor,
      annotationTextColor,
      annotationBold,
      manualMode,
      manualPriority,
      manualInputType,
      manualRepetitions,
      manualDistance,
      macroFinal,
      appliedTechnique
    } = body;
    
    console.log('📥 [API CREATE] Extracted values:');
    console.log('  manualInputType:', `"${manualInputType}"`);
    console.log('  Type:', typeof manualInputType);
    console.log('  Is undefined?:', manualInputType === undefined);
    console.log('  Is null?:', manualInputType === null);
    console.log('  Is empty string?:', manualInputType === '');
    console.log('  Truthy?:', !!manualInputType);
    console.log('  manualMode:', manualMode);
    console.log('  manualPriority:', manualPriority);
    console.log('  manualRepetitions:', manualRepetitions);
    console.log('  manualDistance:', manualDistance);

    // Validation
    if (!workoutSessionId || !sectionId || !letter || !sport || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: workoutSessionId, sectionId, letter, sport, description' },
        { status: 400 }
      );
    }

    // For ANNOTATION type, movelaps can be empty
    if (type !== 'ANNOTATION' && (!movelaps || !Array.isArray(movelaps) || movelaps.length === 0)) {
      return NextResponse.json(
        { error: 'Movelaps array is required and must have at least one movelap' },
        { status: 400 }
      );
    }

    // Verify workout session exists
    const workoutSession = await prisma.workoutSession.findUnique({
      where: { id: workoutSessionId }
    });

    if (!workoutSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    // Verify section exists
    const section = await prisma.workoutSection.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Create moveframe with movelaps in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the moveframe
      const moveframeType = type || 'STANDARD';
      console.log('🔍 Creating moveframe with data:', {
        manualMode: manualMode || false,
        hasNotes: !!notes,
        notesLength: notes?.length || 0,
        type: moveframeType
      });

      const moveframeDataToSave = {
        workoutSessionId,
        sectionId,
        letter,
        sport,
        type: moveframeType,
        description,
        notes: notes || null,
        manualMode: manualMode || false,
        manualPriority: manualPriority || false,
        manualInputType: manualInputType || 'meters',
        repetitions: manualRepetitions ? parseInt(manualRepetitions) : null,
        distance: manualDistance ? parseInt(manualDistance) : null,
        macroFinal: macroFinal || null,
        appliedTechnique: appliedTechnique || null,
        // Annotation fields: only save if type is ANNOTATION
        annotationText: moveframeType === 'ANNOTATION' ? (annotationText || null) : null,
        annotationBgColor: moveframeType === 'ANNOTATION' ? (annotationBgColor || null) : null,
        annotationTextColor: moveframeType === 'ANNOTATION' ? (annotationTextColor || null) : null,
        annotationBold: moveframeType === 'ANNOTATION' ? (annotationBold !== undefined ? annotationBold : false) : false
      };
      
      console.log('💾 [API CREATE] Saving moveframe with:', {
        manualMode: moveframeDataToSave.manualMode,
        manualPriority: moveframeDataToSave.manualPriority,
        manualInputType: `"${moveframeDataToSave.manualInputType}"`,
        repetitions: moveframeDataToSave.repetitions,
        distance: moveframeDataToSave.distance
      });
      
      const moveframe = await tx.moveframe.create({
        data: moveframeDataToSave
      });

      console.log('✅ Moveframe created:', {
        id: moveframe.id,
        manualMode: moveframe.manualMode,
        hasNotes: !!moveframe.notes
      });
      
      console.log('🚨🚨🚨 [API CREATE] CRITICAL - What Prisma actually saved:');
      console.log('  moveframe.id:', moveframe.id);
      console.log('  moveframe.manualMode:', moveframe.manualMode);
      console.log('  moveframe.manualPriority:', moveframe.manualPriority);
      console.log('  moveframe.manualInputType:', `"${moveframe.manualInputType}"`);
      console.log('  moveframe.repetitions:', moveframe.repetitions);
      console.log('  moveframe.distance:', moveframe.distance);
      console.log('  Type of manualInputType from DB:', typeof moveframe.manualInputType);

      // Create all movelaps (skip if empty array for ANNOTATION type)
      const createdMovelaps = movelaps && movelaps.length > 0 
        ? await Promise.all(
            movelaps.map((movelap: any) => {
              // If appliedTechnique exists, append it to the movelap notes
              let movelapNotes = movelap.notes || '';
              if (appliedTechnique) {
                movelapNotes = movelapNotes 
                  ? `${movelapNotes}\n\nTechnique: ${appliedTechnique}`
                  : `Technique: ${appliedTechnique}`;
              }
              
              return tx.movelap.create({
                data: {
                  moveframeId: moveframe.id,
                  repetitionNumber: movelap.repetitionNumber,
                  distance: movelap.distance || null,
                  speed: movelap.speed || null,
                  style: movelap.style || null,
                  pace: movelap.pace || null,
                  time: movelap.time || null,
                  rowPerMin: movelap.rowPerMin ? parseInt(movelap.rowPerMin) : null,
                  reps: movelap.reps ? parseInt(movelap.reps) : null,
                  weight: movelap.weight || null,
                  tools: movelap.tools || null,
                  muscularSector: movelap.muscularSector || null,
                  exercise: movelap.exercise || null,
                  r1: movelap.r1 || null,
                  r2: movelap.r2 || null,
                  restType: movelap.restType || null,
                  pause: movelap.pause || null,
                  macroFinal: movelap.macroFinal || null,
                  alarm: movelap.alarm || null,
                  sound: movelap.sound || null,
                  notes: movelapNotes || null,
                  status: movelap.status || 'PENDING',
                  isSkipped: movelap.isSkipped || false,
                  isDisabled: movelap.isDisabled || false
                }
              });
            })
          )
        : [];

      return {
        moveframe,
        movelaps: createdMovelaps
      };
    });

    console.log(`✅ Moveframe created with ${result.movelaps.length} movelaps:`, result.moveframe.id);

    return NextResponse.json({
      success: true,
      moveframe: result.moveframe,
      movelaps: result.movelaps
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating moveframe with movelaps:', error);
    return NextResponse.json(
      {
        error: 'Failed to create moveframe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

