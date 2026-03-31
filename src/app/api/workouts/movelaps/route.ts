import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const extractCircuitMetaFromNotes = (notes: unknown) => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const upsertCircuitMetaInNotes = (notes: unknown, circuitMeta: any) => {
  const base = typeof notes === 'string' ? notes : '';
  const cleaned = base.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '').trim();
  const metaString = `[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
  return cleaned ? `${cleaned}\n${metaString}` : metaString;
};

// Helper function to convert display rest type to enum value
function convertRestTypeToEnum(restType: string | null | undefined) {
  if (!restType || restType.trim() === '') return null;
  
  const mapping: Record<string, string> = {
    'Set time': 'SET_TIME',
    'Restart time': 'RESTART_TIME',
    'Restart pulse': 'RESTART_PULSE',
    'SET_TIME': 'SET_TIME', // Already correct
    'RESTART_TIME': 'RESTART_TIME', // Already correct
    'RESTART_PULSE': 'RESTART_PULSE' // Already correct
  };
  
  const result = mapping[restType] || null;
  return result as any; // Cast to enum type for Prisma
}

// POST /api/workouts/movelaps - Create a new movelap
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
    const {
      moveframeId,
      repetitionNumber,
      distance,
      speed,
      style,
      pace,
      time,
      rowPerMin,
      pause,
      alarm,
      sound,
      notes,
      reps,
      weight,
      tools,
      muscularSector,
      exercise,
      restType,
      r1,
      r2,
      macroFinal,
      status = 'PENDING'
    } = body;

    console.log('📥 Creating movelap:', body);

    // Validate required fields
    if (!moveframeId) {
      return NextResponse.json({ error: 'moveframeId is required' }, { status: 400 });
    }

    if (!repetitionNumber) {
      return NextResponse.json({ error: 'repetitionNumber is required' }, { status: 400 });
    }

    let baseStationNumber: number | null = null;
    const movelap = await prisma.$transaction(async (tx) => {
      await tx.movelap.updateMany({
        where: {
          moveframeId,
          repetitionNumber: { gte: repetitionNumber }
        },
        data: {
          repetitionNumber: { increment: 1 }
        }
      });

      let inferredCircuitMeta: any = extractCircuitMetaFromNotes(notes);
      if (!inferredCircuitMeta) {
        const prev = repetitionNumber > 1
          ? await tx.movelap.findFirst({
              where: { moveframeId, repetitionNumber: repetitionNumber - 1 },
              select: { notes: true }
            })
          : null;
        const prevMeta = extractCircuitMetaFromNotes(prev?.notes);
        if (prevMeta?.circuitLetter && (prevMeta.localSeriesNumber ?? prevMeta.seriesNumber) && typeof prevMeta.stationNumber === 'number') {
          baseStationNumber = prevMeta.stationNumber;
          inferredCircuitMeta = {
            ...prevMeta,
            localSeriesNumber: prevMeta.localSeriesNumber ?? prevMeta.seriesNumber,
            seriesNumber: prevMeta.seriesNumber ?? prevMeta.localSeriesNumber,
            stationNumber: prevMeta.stationNumber + 1
          };
        } else {
          const next = await tx.movelap.findFirst({
            where: { moveframeId, repetitionNumber: repetitionNumber + 1 },
            select: { notes: true }
          });
          const nextMeta = extractCircuitMetaFromNotes(next?.notes);
          if (nextMeta?.circuitLetter && (nextMeta.localSeriesNumber ?? nextMeta.seriesNumber) && typeof nextMeta.stationNumber === 'number') {
            baseStationNumber = (nextMeta.stationNumber || 1) - 1;
            inferredCircuitMeta = {
              ...nextMeta,
              localSeriesNumber: nextMeta.localSeriesNumber ?? nextMeta.seriesNumber,
              seriesNumber: nextMeta.seriesNumber ?? nextMeta.localSeriesNumber,
              stationNumber: nextMeta.stationNumber
            };
          }
        }
      }

      const notesToCreate =
        inferredCircuitMeta
          ? upsertCircuitMetaInNotes(typeof notes === 'string' ? notes : '', inferredCircuitMeta)
          : (notes !== undefined ? notes : null);

      return tx.movelap.create({
        data: {
          moveframeId,
          repetitionNumber,
          distance: distance ? parseInt(distance) : null,
          speed: speed || null,
          style: style || null,
          pace: pace || null,
          time: time || null,
          rowPerMin: rowPerMin ? parseInt(rowPerMin) : null,
          pause: pause || null,
          alarm: alarm ? parseInt(alarm) : null,
          sound: sound || null,
          notes: notesToCreate as any,
          reps: reps ? parseInt(reps) : null,
          weight: weight || null,
          tools: tools || null,
          muscularSector: muscularSector || null,
          exercise: exercise || null,
          restType: convertRestTypeToEnum(restType),
          r1: r1 || null,
          r2: r2 || null,
          macroFinal: macroFinal || null,
          status: status as any,
          isSkipped: false,
          isDisabled: false
        }
      });
    });

    console.log('✅ Movelap created:', movelap.id);

    const createdCircuitMeta = extractCircuitMetaFromNotes(movelap.notes);
    const createdLocalSeriesNumber = createdCircuitMeta?.localSeriesNumber ?? createdCircuitMeta?.seriesNumber;
    if (baseStationNumber !== null && createdCircuitMeta?.circuitLetter && createdLocalSeriesNumber && typeof createdCircuitMeta.stationNumber === 'number') {
      const baseStation = baseStationNumber;
      const tokenNotes = await prisma.movelap.findMany({
        where: { moveframeId, repetitionNumber: { gt: repetitionNumber } },
        select: { id: true, notes: true }
      });

      await Promise.all(
        tokenNotes.map(async (ml) => {
          const meta = extractCircuitMetaFromNotes(ml.notes);
          const localSeriesNumber = meta?.localSeriesNumber ?? meta?.seriesNumber;
          if (!meta?.circuitLetter || !localSeriesNumber || typeof meta.stationNumber !== 'number') return;
          if (meta.circuitLetter !== createdCircuitMeta.circuitLetter) return;
          if (localSeriesNumber !== createdLocalSeriesNumber) return;
          if (meta.stationNumber <= baseStation) return;

          const updatedMeta = { ...meta, stationNumber: meta.stationNumber + 1 };
          const updatedNotes = upsertCircuitMetaInNotes(ml.notes ?? '', updatedMeta);
          await prisma.movelap.update({
            where: { id: ml.id },
            data: { notes: updatedNotes }
          });
        })
      );
    }

    return NextResponse.json(movelap, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating movelap:', error);
    console.error('❌ Error details:', error.message);
    return NextResponse.json(
      { error: 'Failed to create movelap', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/workouts/movelaps?id=<movelapId> - Update a movelap
export async function PATCH(request: NextRequest) {
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
    const movelapId = searchParams.get('id');

    if (!movelapId) {
      return NextResponse.json({ error: 'Movelap ID is required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('📝 Updating movelap:', movelapId, body);
    console.log('📋 Notes field being updated:', body.notes);

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const parseIntOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    };

    // Only apply keys present on the body. The circuit station editor (and other callers)
    // send partial PATCH bodies; the old "set every column" behavior nulled all omitted fields
    // and wiped the whole grid after a single-station save.
    const data: Record<string, unknown> = {};

    if (has('repetitionNumber')) data.repetitionNumber = body.repetitionNumber;
    if (has('distance')) data.distance = parseIntOrNull(body.distance);
    if (has('speed')) data.speed = body.speed || null;
    if (has('style')) data.style = body.style || null;
    if (has('pace')) data.pace = body.pace || null;
    if (has('time')) data.time = body.time || null;
    if (has('rowPerMin')) data.rowPerMin = parseIntOrNull(body.rowPerMin);
    if (has('pause')) data.pause = body.pause || null;
    if (has('alarm')) data.alarm = parseIntOrNull(body.alarm);
    if (has('sound')) data.sound = body.sound || null;
    if (has('notes')) data.notes = body.notes ?? null;
    if (has('reps')) data.reps = parseIntOrNull(body.reps);
    if (has('weight')) data.weight = body.weight || null;
    if (has('tools')) data.tools = body.tools || null;
    if (has('muscularSector')) data.muscularSector = body.muscularSector || null;
    if (has('exercise')) data.exercise = body.exercise || null;
    if (has('restType')) data.restType = convertRestTypeToEnum(body.restType);
    if (has('r1')) data.r1 = body.r1 || null;
    if (has('r2')) data.r2 = body.r2 || null;
    if (has('macroFinal')) data.macroFinal = body.macroFinal || null;
    if (has('status')) data.status = body.status as any;
    if (has('isSkipped')) data.isSkipped = !!body.isSkipped;
    if (has('isDisabled')) data.isDisabled = !!body.isDisabled;
    if (has('isNewlyAdded')) data.isNewlyAdded = !!body.isNewlyAdded;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const movelap = await prisma.movelap.update({
      where: { id: movelapId },
      data: data as any
    });

    console.log('✅ Movelap updated:', movelap.id);
    console.log('✅ Updated notes value:', movelap.notes);

    return NextResponse.json(movelap);
  } catch (error: any) {
    console.error('❌ Error updating movelap:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Failed to update movelap', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/movelaps?id=<movelapId> - Delete a movelap
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
    const movelapId = searchParams.get('id');

    if (!movelapId) {
      return NextResponse.json({ error: 'Movelap ID is required' }, { status: 400 });
    }

    console.log('🗑️ Deleting movelap:', movelapId);

    await prisma.movelap.delete({
      where: { id: movelapId }
    });

    console.log('✅ Movelap deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting movelap:', error);
    return NextResponse.json(
      { error: 'Failed to delete movelap', details: error.message },
      { status: 500 }
    );
  }
}
