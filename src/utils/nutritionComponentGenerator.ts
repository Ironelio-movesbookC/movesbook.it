/**
 * Utility functions for generating nutrition_components from nutritionFood form data
 */

export interface NutritionComponentData {
  nutritionFoodId: string;
  repetitionNumber: number;
  distance?: number;
  speed?: string;
  style?: string;
  pace?: string;
  time?: string;
  reps?: number;
  restType?: string | null;
  pause?: string;
  alarm?: number | null;
  sound?: string;
  notes?: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'DISABLED';
  isSkipped: boolean;
  isDisabled: boolean;
}

export interface SequenceBase {
  repetitions: number;
  pause: string;
  endPause?: string;
}

export interface SwimSequence extends SequenceBase {
  meters: number;
  speed: string;
  style: string;
}

export interface BikeSequence extends SequenceBase {
  meters: number;
  speed: string;
  r1?: string;
  r2?: string;
}

export interface RunSequence extends SequenceBase {
  meters: number;
  speed: string;
  style: string;
}

export interface BodyBuildingSequence extends SequenceBase {
  exercise: string;
  speed: string;
  reps: number;
  sets: number; // Sets = sequences in this context
}

export interface NutritionComponentGeneratorParams {
  nutritionFoodId: string;
  sport: 'SWIM' | 'BIKE' | 'RUN' | 'BODY_BUILDING' | string;
  sequences: any[];
  globalFields?: {
    pace100?: string;
    time?: string;
    alarm?: number | null;
    sound?: string;
    note?: string;
  };
}

/**
 * Generate nutrition_components from multiple sequences
 */
export function generateNutritionComponents(params: NutritionComponentGeneratorParams): NutritionComponentData[] {
  const { nutritionFoodId, sport, sequences, globalFields = {} } = params;
  const nutrition_components: NutritionComponentData[] = [];
  let currentRepNumber = 1;

  for (let seqIndex = 0; seqIndex < sequences.length; seqIndex++) {
    const sequence = sequences[seqIndex];
    const isLastSequence = seqIndex === sequences.length - 1;

    // Generate nutrition_components for this sequence
    for (let i = 1; i <= sequence.repetitions; i++) {
      const isLastRepInSequence = i === sequence.repetitions;

      // Determine pause for this rep
      let pause = sequence.pause;
      if (isLastRepInSequence && sequence.endPause) {
        // Last rep of sequence gets endPause (transition to next sequence)
        pause = sequence.endPause;
      }

      const nutritionComponent: NutritionComponentData = {
        nutritionFoodId,
        repetitionNumber: currentRepNumber++,
        distance: sequence.meters || sequence.distance || undefined,
        speed: sequence.speed || undefined,
        style: sequence.style || undefined,
        pace: globalFields.pace100 || undefined,
        time: globalFields.time || undefined,
        reps: sequence.reps || undefined,
        restType: undefined,
        pause: pause || undefined,
        alarm: globalFields.alarm || undefined,
        sound: globalFields.sound || undefined,
        notes: globalFields.note || undefined,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false
      };

      nutrition_components.push(nutritionComponent);
    }
  }

  return nutrition_components;
}

/**
 * Generate a human-readable description from sequences
 */
export function generateNutritionFoodDescription(
  sport: string,
  sequences: any[]
): string {
  if (!sequences || sequences.length === 0) {
    return 'Empty nutritionFood';
  }

  const sequenceDescriptions = sequences.map((seq, index) => {
    let desc = '';

    switch (sport) {
      case 'SWIM':
        desc = `${seq.meters}m x ${seq.repetitions} ${seq.speed} ${seq.style} pause ${seq.pause}`;
        break;

      case 'BIKE':
        const rpm = seq.r1 && seq.r2 ? ` R1:${seq.r1} R2:${seq.r2}` : '';
        desc = `${seq.meters}m x ${seq.repetitions} ${seq.speed}${rpm} pause ${seq.pause}`;
        break;

      case 'RUN':
        desc = `${seq.meters}m x ${seq.repetitions} ${seq.speed} ${seq.style} pause ${seq.pause}`;
        break;

      case 'BODY_BUILDING':
        desc = `${seq.exercise} ${seq.reps} reps x ${seq.sets} sets ${seq.speed} pause ${seq.pause}`;
        break;

      default:
        desc = `${seq.repetitions} reps pause ${seq.pause}`;
    }

    // Add endPause if present and not last sequence
    if (seq.endPause && index < sequences.length - 1) {
      desc += ` + ${seq.endPause}`;
    }

    return desc;
  });

  // Join sequences with " + "
  return sequenceDescriptions.join(' + ');
}

/**
 * Calculate total reps across all sequences
 */
export function calculateTotalReps(sequences: SequenceBase[]): number {
  return sequences.reduce((sum, seq) => sum + seq.repetitions, 0);
}

/**
 * Validate sequence data
 */
export function validateSequence(sequence: any, sport: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!sequence.repetitions || sequence.repetitions < 1) {
    errors.push('Repetitions must be at least 1');
  }

  if (!sequence.pause) {
    errors.push('Pause is required');
  }

  switch (sport) {
    case 'SWIM':
    case 'BIKE':
    case 'RUN':
      if (!sequence.meters || sequence.meters < 1) {
        errors.push('Distance/meters is required');
      }
      if (!sequence.speed) {
        errors.push('Speed is required');
      }
      if ((sport === 'SWIM' || sport === 'RUN') && !sequence.style) {
        errors.push('Style is required');
      }
      break;

    case 'BODY_BUILDING':
      if (!sequence.exercise) {
        errors.push('Exercise is required');
      }
      if (!sequence.reps || sequence.reps < 1) {
        errors.push('Reps per set is required');
      }
      if (!sequence.sets || sequence.sets < 1) {
        errors.push('Number of sets is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate all sequences
 */
export function validateSequences(sequences: any[], sport: string): { valid: boolean; errors: string[] } {
  const allErrors: string[] = [];

  sequences.forEach((seq, index) => {
    const result = validateSequence(seq, sport);
    if (!result.valid) {
      allErrors.push(`Sequence ${index + 1}: ${result.errors.join(', ')}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

