/**
 * Pause value formats by Rest type (see PAUSE SETTINGS mock).
 * — Set time / Pause Min.: digits → M'SS''T (e.g. 184 → 0'18''4)
 * — Restart time: digits → M'SS"t (e.g. 3456 → 3'45"6); ≤3 digits → pad to MM'SS"T with implicit tenth 0
 * — Set meters: 0000–9999
 * — Restart pulse: BPM 60–200
 */

/** Set time Pause Min.: compact digit entry → M'SS''T (e.g. 184 → 0'18''4) */
export function formatPauseMinDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  const len = digits.length;
  if (len === 1) return `0'0${digits}''0`;
  if (len === 2) return `0'${digits}''0`;
  if (len === 3) return `0'${digits.slice(0, 2)}''${digits.slice(2)}`;

  const hour = digits.slice(0, -3) || '0';
  const mins = digits.slice(-3, -1) || '00';
  const tenth = digits.slice(-1) || '0';
  return `${hour}'${mins}''${tenth}`;
}

/** Restart time: compact digit entry → M'SS"t */
export function formatRestartTimePauseDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 3) {
    const pad = digits.padStart(3, '0');
    const M = pad[0];
    let SS = pad.slice(1, 3);
    if (parseInt(SS, 10) > 59) SS = '59';
    return `${parseInt(M, 10)}'${SS}"0`;
  }

  const T = digits.slice(-1);
  let SS = digits.slice(-3, -1);
  const min = digits.slice(0, -3);
  let secNum = parseInt(SS, 10);
  if (secNum > 59) SS = '59';
  return `${min}'${SS}"${T}`;
}

/** Set meters: clamp to 0000–9999 */
export function formatPauseMetersDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return '';
  const c = Math.min(9999, Math.max(0, n));
  return String(c).padStart(4, '0');
}

/** Restart pulse: BPM 60–200 */
export function formatRestartPulseBpm(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return '';
  const c = Math.min(200, Math.max(60, n));
  return String(c);
}
