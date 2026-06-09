import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/nutrition/nutrition_foods/create-with-nutrition_components
 * Create a nutritionFood with its nutrition_components in one transaction
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
      nutritionMealId,
      sectionId,
      letter,
      sport,
      type,
      description,
      notes,
      nutrition_components,
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
    if (!nutritionMealId || !sectionId || !letter || !sport || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: nutritionMealId, sectionId, letter, sport, description' },
        { status: 400 }
      );
    }

    // For ANNOTATION type, nutrition_components can be empty
    if (type !== 'ANNOTATION' && (!nutrition_components || !Array.isArray(nutrition_components) || nutrition_components.length === 0)) {
      return NextResponse.json(
        { error: 'NutritionComponents array is required and must have at least one nutritionComponent' },
        { status: 400 }
      );
    }

    // Verify workout session exists
    const nutritionMeal = await prisma.nutritionMeal.findUnique({
      where: { id: nutritionMealId }
    });

    if (!nutritionMeal) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    // Verify section exists
    const section = await prisma.nutritionSection.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Create nutritionFood with nutrition_components in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the nutritionFood
      const nutritionFoodType = type || 'STANDARD';
      console.log('🔍 Creating nutritionFood with data:', {
        manualMode: manualMode || false,
        hasNotes: !!notes,
        notesLength: notes?.length || 0,
        type: nutritionFoodType
      });

      const nutritionFoodDataToSave = {
        nutritionMealId,
        sectionId,
        letter,
        sport,
        type: nutritionFoodType,
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
        annotationText: nutritionFoodType === 'ANNOTATION' ? (annotationText || null) : null,
        annotationBgColor: nutritionFoodType === 'ANNOTATION' ? (annotationBgColor || null) : null,
        annotationTextColor: nutritionFoodType === 'ANNOTATION' ? (annotationTextColor || null) : null,
        annotationBold: nutritionFoodType === 'ANNOTATION' ? (annotationBold !== undefined ? annotationBold : false) : false
      };
      
      console.log('💾 [API CREATE] Saving nutritionFood with:', {
        manualMode: nutritionFoodDataToSave.manualMode,
        manualPriority: nutritionFoodDataToSave.manualPriority,
        manualInputType: `"${nutritionFoodDataToSave.manualInputType}"`,
        repetitions: nutritionFoodDataToSave.repetitions,
        distance: nutritionFoodDataToSave.distance
      });
      
      const nutritionFood = await tx.nutritionFood.create({
        data: nutritionFoodDataToSave
      });

      console.log('✅ NutritionFood created:', {
        id: nutritionFood.id,
        manualMode: nutritionFood.manualMode,
        hasNotes: !!nutritionFood.notes
      });
      
      console.log('🚨🚨🚨 [API CREATE] CRITICAL - What Prisma actually saved:');
      console.log('  nutritionFood.id:', nutritionFood.id);
      console.log('  nutritionFood.manualMode:', nutritionFood.manualMode);
      console.log('  nutritionFood.manualPriority:', nutritionFood.manualPriority);
      console.log('  nutritionFood.manualInputType:', `"${nutritionFood.manualInputType}"`);
      console.log('  nutritionFood.repetitions:', nutritionFood.repetitions);
      console.log('  nutritionFood.distance:', nutritionFood.distance);
      console.log('  Type of manualInputType from DB:', typeof nutritionFood.manualInputType);

      // Create all nutrition_components (skip if empty array for ANNOTATION type)
      const createdNutritionComponents = nutrition_components && nutrition_components.length > 0 
        ? await Promise.all(
            nutrition_components.map((nutritionComponent: any) => {
              // If appliedTechnique exists, append it to the nutritionComponent notes
              const rawNotes = typeof nutritionComponent?.notes === 'string' ? nutritionComponent.notes : '';
              let nutritionComponentNotes = rawNotes;
              if (appliedTechnique) {
                nutritionComponentNotes = nutritionComponentNotes 
                  ? `${nutritionComponentNotes}\n\nTechnique: ${appliedTechnique}`
                  : `Technique: ${appliedTechnique}`;
              }
              const hasCircuitMeta =
                nutritionComponent?.circuitLetter ||
                nutritionComponent?.circuitIndex != null ||
                nutritionComponent?.stationNumber != null ||
                nutritionComponent?.localSeriesNumber != null ||
                nutritionComponent?.seriesNumber != null;
              if (hasCircuitMeta) {
                const cleanedNotes = nutritionComponentNotes.replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '').trim();
                const circuitMeta = {
                  circuitLetter: nutritionComponent?.circuitLetter ?? null,
                  circuitIndex: nutritionComponent?.circuitIndex ?? null,
                  seriesNumber: nutritionComponent?.seriesNumber ?? null,
                  localSeriesNumber: nutritionComponent?.localSeriesNumber ?? nutritionComponent?.seriesNumber ?? null,
                  stationNumber: nutritionComponent?.stationNumber ?? null
                };
                const metaString = `[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
                nutritionComponentNotes = cleanedNotes ? `${cleanedNotes}\n\n${metaString}` : metaString;
              }
              
              return tx.nutritionComponent.create({
                data: {
                  nutritionFoodId: nutritionFood.id,
                  repetitionNumber: nutritionComponent.repetitionNumber,
                  distance: nutritionComponent.distance || null,
                  speed: nutritionComponent.speed || null,
                  style: nutritionComponent.style || null,
                  pace: nutritionComponent.pace || null,
                  time: nutritionComponent.time || null,
                  rowPerMin: nutritionComponent.rowPerMin ? parseInt(nutritionComponent.rowPerMin) : null,
                  reps: nutritionComponent.reps ? parseInt(nutritionComponent.reps) : null,
                  weight: nutritionComponent.weight || null,
                  tools: nutritionComponent.tools || null,
                  muscularSector: nutritionComponent.muscularSector || null,
                  exercise: nutritionComponent.exercise || null,
                  r1: nutritionComponent.r1 || null,
                  r2: nutritionComponent.r2 || null,
                  restType: nutritionComponent.restType || null,
                  pause: nutritionComponent.pause || null,
                  macroFinal: nutritionComponent.macroFinal || null,
                  alarm: nutritionComponent.alarm || null,
                  sound: nutritionComponent.sound || null,
                  notes: nutritionComponentNotes || null,
                  status: nutritionComponent.status || 'PENDING',
                  isSkipped: nutritionComponent.isSkipped || false,
                  isDisabled: nutritionComponent.isDisabled || false
                }
              });
            })
          )
        : [];

      return {
        nutritionFood,
        nutritionComponents: createdNutritionComponents
      };
    });

    console.log(`✅ NutritionFood created with ${result.nutritionComponents.length} nutritionComponents:`, result.nutritionFood.id);

    return NextResponse.json({
      success: true,
      nutritionFood: result.nutritionFood,
      nutritionComponents: result.nutritionComponents
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating nutritionFood with nutritionComponents:', error);
    return NextResponse.json(
      {
        error: 'Failed to create nutritionFood',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

