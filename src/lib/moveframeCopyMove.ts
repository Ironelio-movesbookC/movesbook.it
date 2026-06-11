/**
 * Resolve IDs for moveframe copy/move flows (modals, drag-drop, API).
 */

export type MoveframePosition = 'before' | 'after' | 'replace';

export type MoveframeCopyMovePayload = {
  sourceMoveframeId: string;
  targetWorkoutId: string;
  position: MoveframePosition;
  targetMoveframeId?: string;
};

export function resolveMoveframeId(moveframe: unknown): string | undefined {
  if (!moveframe) return undefined;
  if (Array.isArray(moveframe)) {
    return resolveMoveframeId(moveframe[0]);
  }
  const mf = moveframe as { id?: string; moveframeId?: string };
  const id = mf.id ?? mf.moveframeId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

export function resolveWorkoutSessionId(workout: unknown): string | undefined {
  if (!workout) return undefined;
  const w = workout as { id?: string; workoutSessionId?: string };
  const id = w.id ?? w.workoutSessionId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

export function parseMoveframeCopyMoveBody(body: Record<string, unknown>): {
  sourceMoveframeId?: string;
  targetWorkoutId?: string;
  position: MoveframePosition;
  targetMoveframeId?: string;
} {
  const sourceMoveframeId =
    (typeof body.sourceMoveframeId === 'string' && body.sourceMoveframeId.trim()) ||
    (typeof body.moveframeId === 'string' && body.moveframeId.trim()) ||
    undefined;

  const targetWorkoutId =
    (typeof body.targetWorkoutId === 'string' && body.targetWorkoutId.trim()) ||
    (typeof body.targetWorkoutSessionId === 'string' && body.targetWorkoutSessionId.trim()) ||
    undefined;

  const positionRaw = body.position;
  const position: MoveframePosition =
    positionRaw === 'before' || positionRaw === 'replace' ? positionRaw : 'after';

  const targetMoveframeId =
    typeof body.targetMoveframeId === 'string' && body.targetMoveframeId.trim()
      ? body.targetMoveframeId.trim()
      : undefined;

  return { sourceMoveframeId, targetWorkoutId, position, targetMoveframeId };
}

export function missingMoveframeCopyMoveFields(parsed: {
  sourceMoveframeId?: string;
  targetWorkoutId?: string;
}): string[] {
  const missing: string[] = [];
  if (!parsed.sourceMoveframeId) missing.push('sourceMoveframeId');
  if (!parsed.targetWorkoutId) missing.push('targetWorkoutId');
  return missing;
}

/** Parsed body with required IDs (after missing-field validation). */
export function toMoveframeCopyMovePayload(parsed: {
  sourceMoveframeId?: string;
  targetWorkoutId?: string;
  position: MoveframePosition;
  targetMoveframeId?: string;
}): MoveframeCopyMovePayload | null {
  if (!parsed.sourceMoveframeId || !parsed.targetWorkoutId) return null;
  return {
    sourceMoveframeId: parsed.sourceMoveframeId,
    targetWorkoutId: parsed.targetWorkoutId,
    position: parsed.position,
    targetMoveframeId: parsed.targetMoveframeId,
  };
}
