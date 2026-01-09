import {
  CENT_ZBIT_STEP,
  combineNotesSerial,
  HashrateRange,
  humanHashrate,
  noteFromCentZBits,
  noteFromComponents,
  noteFromZBits,
  parseNoteLabel,
  Sharenote
} from '@soprinter/sharenotejs';

const SHARENOTE_RANGE_MAX_STEPS = 512;

export const normalizeWorkerKey = (value?: string | null) => {
  if (value === null || value === undefined) return 'unknown';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'unknown';
};

export const toNote = (value: number | string | undefined | null): Sharenote | undefined => {
  if (value === undefined || value === null) return undefined;
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '') return undefined;

  const tryFromZBits = (input: number) => {
    try {
      return noteFromZBits(input);
    } catch {
      return undefined;
    }
  };
  const tryFromCentZBits = (input: number) => {
    try {
      return noteFromCentZBits(input);
    } catch {
      return undefined;
    }
  };

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return tryFromZBits(raw) ?? (Number.isInteger(raw) ? tryFromCentZBits(raw) : undefined);
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const noteFromNumber =
      tryFromZBits(numeric) ?? (Number.isInteger(numeric) ? tryFromCentZBits(numeric) : undefined);
    if (noteFromNumber) return noteFromNumber;
  }

  try {
    const parsed = parseNoteLabel(String(raw));
    return noteFromComponents(parsed.z, parsed.cents);
  } catch {
    return undefined;
  }
};

export const expandRangeNotes = (raw?: string | number | null): Sharenote[] | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed.includes('-')) return undefined;

  const [startRaw, endRaw] = trimmed
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!startRaw || !endRaw) return undefined;

  const startNote = toNote(startRaw);
  const endNote = toNote(endRaw);
  if (!startNote || !endNote) return undefined;

  const lower = Math.min(startNote.zBits, endNote.zBits);
  const upper = Math.max(startNote.zBits, endNote.zBits);
  const step = Math.max(CENT_ZBIT_STEP || 0.01, (upper - lower) / SHARENOTE_RANGE_MAX_STEPS);

  const notes: Sharenote[] = [];
  for (let z = lower; z <= upper && notes.length < SHARENOTE_RANGE_MAX_STEPS; z += step) {
    const note = toNote(z);
    if (note) notes.push(note);
  }

  if (!notes.length) return undefined;
  const lastNote = notes[notes.length - 1];
  if (lastNote.zBits !== upper && notes.length < SHARENOTE_RANGE_MAX_STEPS) {
    const endNoteNormalized = toNote(upper);
    if (endNoteNormalized) notes.push(endNoteNormalized);
  }

  return notes;
};

export const combineRangeNotes = (notes?: Sharenote[] | null): Sharenote | undefined => {
  if (!notes?.length) return undefined;
  if (notes.length === 1) return notes[0];
  try {
    return combineNotesSerial(notes);
  } catch {
    return undefined;
  }
};

export const resolveNoteFromRaw = (raw?: string | number | null): Sharenote | undefined => {
  const rangeNotes = expandRangeNotes(raw);
  if (rangeNotes) {
    const combined = combineRangeNotes(rangeNotes);
    if (combined) return combined;
  }
  return toNote(raw);
};

export const getHashrateRangeAverage = (range?: HashrateRange | null) => {
  if (!range) return { value: undefined, display: undefined };
  const { minimum, maximum } = range;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return { value: undefined, display: undefined };
  }
  const midpoint = (minimum + maximum) / 2;
  if (!(midpoint > 0)) return { value: undefined, display: undefined };
  const human = humanHashrate(midpoint);
  return { value: midpoint, display: human?.display };
};

export const SHARENOTE_UTILS = {
  SHARENOTE_RANGE_MAX_STEPS,
  normalizeWorkerKey,
  toNote,
  expandRangeNotes,
  combineRangeNotes,
  resolveNoteFromRaw,
  getHashrateRangeAverage
};

export type { Sharenote };
