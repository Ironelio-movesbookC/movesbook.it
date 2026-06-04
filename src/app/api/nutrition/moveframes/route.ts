import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { restTypeDisplayToDb } from '@/utils/restTypeDb';

function convertRestTypeToEnum(restType: string | null | undefined): string | null {
  return restTypeDisplayToDb(restType ?? undefined);
}

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

    console.log('POST /api/nutrition/nutritionFoods - Request received');
    
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const {
      nutritionMealId,
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
      nutrition_components,
      manualMode,
      manualPriority,    // Priority flag for manual mode display
      manualRepetitions, // For storing on NutritionFood model (manual mode only)
      repetitions,       // Series count from planner (e.g. circuit total station slots)
      manualDistance,    // For storing on NutritionFood model (manual mode only)
      manualInputType,   // For aerobic sports: "meters" or "time"
      appliedTechnique,  // Execution technique for Body Building
      aerobicSeries      // Series/Batteries/Groups for aerobic sports
    } = body;

    // 🔍 DEBUG: Log manual mode fields
    if (manualMode) {
      console.log('🔍 [API POST] Manual mode nutritionFood creation:');
      console.log('   Sport:', sport);
      console.log('   manualMode:', manualMode);
      console.log('   manualPriority:', manualPriority);
      console.log('   manualInputType (raw):', manualInputType);
      console.log('   manualInputType (type):', typeof manualInputType);
      console.log('   manualRepetitions (raw):', manualRepetitions);
      console.log('   manualRepetitions (type):', typeof manualRepetitions);
      console.log('   manualRepetitions (parsed):', manualRepetitions !== undefined ? parseInt(manualRepetitions) : null);
      console.log('   manualDistance (raw):', manualDistance);
      console.log('   manualDistance (type):', typeof manualDistance);
      console.log('   manualDistance (parsed):', manualDistance !== undefined ? parseInt(manualDistance) : null);
    }
    
    // Validate required fields
    if (!nutritionMealId) {
      console.error('Missing nutritionMealId');
      return NextResponse.json({ error: 'nutritionMealId is required' }, { status: 400 });
    }
    if (!sport) {
      console.error('Missing sport');
      return NextResponse.json({ error: 'sport is required' }, { status: 400 });
    }
    // NutritionComponents are required for all types EXCEPT ANNOTATION and manual mode
    if (type !== 'ANNOTATION' && !manualMode && (!nutrition_components || !Array.isArray(nutrition_components) || nutrition_components.length === 0)) {
      console.error('Invalid nutritionComponents:', nutrition_components);
      return NextResponse.json({ error: 'nutrition_components must be a non-empty array' }, { status: 400 });
    }
    
    console.log('Validated - nutritionMealId:', nutritionMealId);
    console.log('Validated - sport:', sport);
    console.log('Validated - type:', type);
    console.log('Validated - manualMode:', manualMode);
    console.log('Validated - appliedTechnique:', appliedTechnique);
    console.log('Validated - nutrition_components count:', nutrition_components?.length || 0);

    // Ensure we have a valid sectionId - create default section if needed
    let finalSectionId = sectionId;
    
    if (!finalSectionId || finalSectionId === 'default') {
      console.log('No valid sectionId provided, finding or creating default section...');
      
      let defaultSection = await prisma.nutritionSection.findFirst({
        where: {
          userId: decoded.userId,
          name: 'Default'
        }
      });
      
      if (!defaultSection) {
        console.log('Creating default section for user:', decoded.userId);
        defaultSection = await prisma.nutritionSection.create({
          data: {
            userId: decoded.userId,
            name: 'Default',
            description: 'Default workout section',
            color: '#3b82f6'
          }
        });
        console.log('Default section created:', defaultSection.id);
      } else {
        console.log('Using existing default section:', defaultSection.id);
      }
      
      finalSectionId = defaultSection.id;
    }

    // Get existing nutritionFoods count to determine letter
    const existingCount = await prisma.nutritionFood.count({
      where: { nutritionMealId }
    });
    
    console.log('Creating nutritionFood - letter will be:', indexToLetter(existingCount));
    
    const resolvedRepetitions = manualMode
      ? manualRepetitions !== undefined && manualRepetitions !== null && manualRepetitions !== ''
        ? parseInt(String(manualRepetitions), 10)
        : null
      : repetitions !== undefined && repetitions !== null && repetitions !== ''
        ? parseInt(String(repetitions), 10)
        : nutrition_components?.length
          ? nutrition_components.length
          : null;

    const nutritionFoodData = {
      nutritionMealId,
      letter: indexToLetter(existingCount),
      sport: sport as any,
      sectionId: finalSectionId,
      type: type as any,
      description: description || '',
      notes: notes || null,
      macroFinal: macroFinal || null,
      alarm: alarm ? parseInt(alarm) : null,
      manualMode: manualMode || false,
      manualPriority: manualPriority || false,
      repetitions: resolvedRepetitions,
      distance: manualDistance !== undefined && manualDistance !== null && manualDistance !== '' ? parseInt(manualDistance) : null,
      manualInputType: manualInputType || 'meters', // For aerobic sports: "meters" or "time"
      appliedTechnique: appliedTechnique || null, // Execution technique for Body Building
      aerobicSeries: aerobicSeries !== undefined && aerobicSeries !== null && aerobicSeries !== '' ? parseInt(aerobicSeries) : null, // Series/Batteries/Groups for aerobic sports
      annotationText: annotationText || null,
      annotationBgColor: annotationBgColor || null,
      annotationTextColor: annotationTextColor || null,
      annotationBold: annotationBold !== undefined ? annotationBold : false,
    };

    // 🔍 DEBUG: Log what's being saved
    if (manualMode) {
      console.log('📝 [API POST] NutritionFood data being saved to database:');
      console.log('   manualInputType:', nutritionFoodData.manualInputType);
      console.log('   repetitions (from manualRepetitions):', nutritionFoodData.repetitions);
      console.log('   distance (from manualDistance):', nutritionFoodData.distance);
    }
    
    const nutrition_componentsData = nutrition_components && nutrition_components.length > 0 ? nutrition_components.map((lap: any, index: number) => {
      // If appliedTechnique exists, append it to the nutritionComponent notes
      let nutritionComponentNotes = lap.notes || '';
      if (appliedTechnique) {
        console.log(`✅ Adding technique "${appliedTechnique}" to nutritionComponent ${index + 1} notes`);
        nutritionComponentNotes = nutritionComponentNotes 
          ? `${nutritionComponentNotes}\n\nTechnique: ${appliedTechnique}`
          : `Technique: ${appliedTechnique}`;
      }
      
      // 2026-01-22 10:45 UTC - Preserve circuit-specific metadata in notes
      if (lap.circuitLetter) {
        const circuitMeta = {
          circuitLetter: lap.circuitLetter,
          circuitIndex: lap.circuitIndex,
          seriesNumber: lap.seriesNumber,
          localSeriesNumber: lap.localSeriesNumber,
          stationNumber: lap.stationNumber,
          sector: lap.sector
        };
        const metaString = `\n[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
        nutritionComponentNotes = nutritionComponentNotes + metaString;
      }
      
      // 2026-01-22 11:10 UTC - Convert pause to string if it's a number (for circuit nutrition_components)
      let pauseValue = lap.pause || null;
      if (typeof pauseValue === 'number') {
        // Convert seconds to time string format (e.g., 10 -> "0'10"", 90 -> "1'30"")
        const minutes = Math.floor(pauseValue / 60);
        const seconds = pauseValue % 60;
        pauseValue = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
      }
      
      const repsParsed = lap.reps != null && lap.reps !== '' ? parseInt(String(lap.reps), 10) : null;
      const repsValid = repsParsed != null && !Number.isNaN(repsParsed) ? repsParsed : null;
      const distanceParsed = lap.distance != null && lap.distance !== '' ? parseInt(String(lap.distance), 10) : null;
      const distanceValid = distanceParsed != null && !Number.isNaN(distanceParsed) ? distanceParsed : null;
      return {
        repetitionNumber: lap.repetitionNumber || (index + 1),
        distance: distanceValid,
        speed: (lap.circuitLetter && lap.reps != null && lap.reps !== '') ? String(lap.reps) : (lap.speed || null), // 2026-01-22 14:20 UTC - Use reps for circuits only; for bodybuilding use speed (tempo)
        style: lap.sector || lap.style || null, // 2026-01-22 14:20 UTC - Use sector for circuits, style for regular
        pace: lap.pace || null,
        time: lap.time || null,
        reps: repsValid,
        weight: lap.weight != null && lap.weight !== '' ? String(lap.weight) : null,
        tools: lap.tools || null,
        r1: lap.r1 || null,
        r2: lap.r2 || null,
        muscularSector: lap.muscularSector || null,
        exercise: lap.exercise || null,
        // Convert display value to enum value
        restType: convertRestTypeToEnum(lap.restType),
        pause: pauseValue,
        macroFinal: lap.macroFinal || null,
        alarm: (() => {
          if (lap.alarm == null || lap.alarm === '') return null;
          const n = parseInt(String(lap.alarm), 10);
          return Number.isNaN(n) ? null : n;
        })(),
        sound: lap.sound || null,
        notes: nutritionComponentNotes || null,
        status: (lap.status || 'PENDING') as any,
        isSkipped: lap.isSkipped || false,
        isDisabled: lap.isDisabled || false
      };
    }) : [];
    
    console.log('NutritionFood data:', JSON.stringify(nutritionFoodData, null, 2));
    console.log('NutritionComponents data:', JSON.stringify(nutrition_componentsData, null, 2));

    const nutritionFood = await prisma.nutritionFood.create({
      data: {
        ...nutritionFoodData,
        nutritionComponents: nutrition_componentsData.length > 0 ? {
          create: nutrition_componentsData
        } : undefined
      },
      include: {
        section: true,
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        }
      }
    });

    console.log('✅ NutritionFood created successfully:', nutritionFood.id);
    
    // 🔍 DEBUG: Log what was saved and returned
    if (manualMode) {
      console.log('✅ [API POST] NutritionFood saved and returned:');
      console.log('   ID:', nutritionFood.id);
      console.log('   manualInputType (stored in DB):', nutritionFood.manualInputType);
      console.log('   repetitions (stored on NutritionFood):', nutritionFood.repetitions);
      console.log('   distance (stored on NutritionFood):', nutritionFood.distance);
      console.log('   manualMode:', nutritionFood.manualMode);
    }

    return NextResponse.json({ nutritionFood });
  } catch (error: any) {
    console.error('❌ Error creating nutritionFood:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Failed to create nutritionFood',
        details: error.message,
        code: error.code,
        name: error.name
      },
      { status: 500 }
    );
  }
}

function indexToLetter(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

