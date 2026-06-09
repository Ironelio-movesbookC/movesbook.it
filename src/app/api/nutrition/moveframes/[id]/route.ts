import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/nutrition/nutrition_foods/[id] - Get a single nutritionFood with nutrition_components
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

    // Fetch nutritionFood with nutrition_components
    const nutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: params.id },
      include: {
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true,
        nutritionMeal: {
          include: {
            nutritionDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!nutritionFood) {
      return NextResponse.json({ error: 'NutritionFood not found' }, { status: 404 });
    }

    // Verify ownership
    if (nutritionFood.nutritionMeal.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your nutritionFood' }, { status: 403 });
    }

    return NextResponse.json(nutritionFood);
  } catch (error: any) {
    console.error('❌ Error fetching nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutritionFood', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/nutrition/nutrition_foods/[id] - Update a nutritionFood
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
      manualRepetitions, // For storing on NutritionFood model (manual mode only)
      repetitions,       // Series / circuit slot count (non-manual)
      manualDistance,    // For storing on NutritionFood model (manual mode only)
      appliedTechnique,  // Body Building technique
      aerobicSeries      // Series/Batteries/Groups for aerobic sports
    } = body;

    console.log('📝 [API UPDATE] Updating nutritionFood:', params.id, {
      ...body,
      manualPriority: body.manualPriority
    });

    // First verify user ownership through workout session -> day
    const existingNutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: params.id },
      include: {
        nutritionMeal: {
          include: {
            nutritionDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingNutritionFood) {
      return NextResponse.json({ error: 'NutritionFood not found' }, { status: 404 });
    }

    if (existingNutritionFood.nutritionMeal.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your nutritionFood' }, { status: 403 });
    }

    // Log update data for debugging
    console.log('📝 Updating nutritionFood with data:', {
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
      console.log('🔍 [API PATCH] Manual mode nutritionFood update:');
      console.log('   manualRepetitions (raw):', manualRepetitions);
      console.log('   manualDistance (raw):', manualDistance);
      console.log('   manualInputType (raw):', `"${manualInputType}"`);
    }

    // Update nutritionFood
    const nutritionFood = await prisma.nutritionFood.update({
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
        repetitions:
          manualRepetitions !== undefined
            ? manualRepetitions !== null && manualRepetitions !== ''
              ? parseInt(String(manualRepetitions), 10)
              : null
            : repetitions !== undefined
              ? repetitions !== null && repetitions !== ''
                ? parseInt(String(repetitions), 10)
                : null
              : undefined,
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
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true
      }
    });

    // If appliedTechnique changed, update all nutritionComponent notes
    if (appliedTechnique !== undefined && appliedTechnique !== existingNutritionFood.appliedTechnique) {
      const nutrition_components = await prisma.nutritionComponent.findMany({
        where: { nutritionFoodId: params.id }
      });

      for (const nutritionComponent of nutrition_components) {
        let updatedNotes = nutritionComponent.notes || '';
        
        // Remove old technique if it exists
        if (existingNutritionFood.appliedTechnique) {
          const oldTechniquePattern = new RegExp(`\\n?\\n?Technique: ${existingNutritionFood.appliedTechnique}`, 'g');
          updatedNotes = updatedNotes.replace(oldTechniquePattern, '').trim();
        }
        
        // Add new technique if provided
        if (appliedTechnique) {
          updatedNotes = updatedNotes 
            ? `${updatedNotes}\n\nTechnique: ${appliedTechnique}`
            : `Technique: ${appliedTechnique}`;
        }
        
        await prisma.nutritionComponent.update({
          where: { id: nutritionComponent.id },
          data: { notes: updatedNotes || null }
        });
      }
      
      console.log(`✅ Updated ${nutrition_components.length} nutritionComponent notes with technique: ${appliedTechnique || '(removed)'}`);
    }

    // 🔍 DEBUG: Log what was saved
    if (manualMode || nutritionFood.manualMode) {
      console.log('✅ [API PATCH] NutritionFood updated and returned:');
      console.log('   ID:', nutritionFood.id);
      console.log('   repetitions (stored on NutritionFood):', nutritionFood.repetitions);
      console.log('   distance (stored on NutritionFood):', nutritionFood.distance);
    }

    console.log('✅ NutritionFood updated:', {
      id: nutritionFood.id,
      manualMode: nutritionFood.manualMode,
      manualPriority: nutritionFood.manualPriority,
      manualPriorityType: typeof nutritionFood.manualPriority
    });

    return NextResponse.json(nutritionFood);
  } catch (error: any) {
    console.error('❌ Error updating nutritionFood:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return NextResponse.json(
      { 
        error: 'Failed to update nutritionFood', 
        details: error.message,
        errorName: error.name,
        errorCode: error.code
      },
      { status: 500 }
    );
  }
}

// DELETE /api/nutrition/nutrition_foods/[id] - Delete a nutritionFood
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

    console.log('🗑️ Deleting nutritionFood:', params.id);

    // First verify user ownership through workout session -> day
    const existingNutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: params.id },
      include: {
        nutritionMeal: {
          include: {
            nutritionDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingNutritionFood) {
      return NextResponse.json({ error: 'NutritionFood not found' }, { status: 404 });
    }

    if (existingNutritionFood.nutritionMeal.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your nutritionFood' }, { status: 403 });
    }

    // Delete nutritionFood (cascade will delete nutrition_components)
    await prisma.nutritionFood.delete({
      where: { id: params.id }
    });

    console.log('✅ NutritionFood deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to delete nutritionFood', details: error.message },
      { status: 500 }
    );
  }
}
