import type { FunctionSettingsTab } from '@/types/adminFunctionSettings';

export type FunctionKeycodeTab = FunctionSettingsTab;

export type FunctionKeycodeRef = {
  tab: FunctionKeycodeTab;
  functionId: number;
};

const keycodeByRef = new Map<string, string>();

function refKey(tab: FunctionKeycodeTab, functionId: number): string {
  return `${tab}:${functionId}`;
}

export function validateKeycodeFormat(keycode: string): string | null {
  const trimmed = keycode.trim();
  if (!trimmed) return null;
  if (trimmed.length > 10) return 'Keycode must be at most 10 characters.';
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return 'Keycode must contain alphanumeric characters only.';
  }
  return null;
}

export function getFunctionKeycode(tab: FunctionKeycodeTab, functionId: number): string {
  return keycodeByRef.get(refKey(tab, functionId)) ?? '';
}

export function setFunctionKeycode(
  tab: FunctionKeycodeTab,
  functionId: number,
  keycode: string,
): { ok: true; keycode: string } | { ok: false; error: string } {
  const trimmed = keycode.trim();
  const formatError = validateKeycodeFormat(trimmed);
  if (formatError) return { ok: false, error: formatError };

  const selfRef = refKey(tab, functionId);

  if (!trimmed) {
    keycodeByRef.delete(selfRef);
    return { ok: true, keycode: '' };
  }

  const normalized = trimmed.toUpperCase();
  for (const [ref, existing] of keycodeByRef) {
    if (ref !== selfRef && existing.toUpperCase() === normalized) {
      return {
        ok: false,
        error: 'This keycode is already assigned to another function.',
      };
    }
  }

  keycodeByRef.set(selfRef, normalized);
  return { ok: true, keycode: normalized };
}

export type FunctionKeycodeEntry = FunctionKeycodeRef & {
  keycode: string;
};

export function getAllFunctionKeycodes(): FunctionKeycodeEntry[] {
  return [...keycodeByRef.entries()].map(([ref, keycode]) => {
    const [tab, idStr] = ref.split(':');
    return {
      tab: tab as FunctionKeycodeTab,
      functionId: Number(idStr),
      keycode,
    };
  });
}

export function findFunctionByKeycode(keycode: string): FunctionKeycodeEntry | null {
  const normalized = keycode.trim().toUpperCase();
  if (!normalized) return null;
  for (const [ref, existing] of keycodeByRef) {
    if (existing.toUpperCase() === normalized) {
      const [tab, idStr] = ref.split(':');
      return {
        tab: tab as FunctionKeycodeTab,
        functionId: Number(idStr),
        keycode: existing,
      };
    }
  }
  return null;
}
