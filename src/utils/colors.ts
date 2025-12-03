import { lighten } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { SHARENOTE_STACK_COLORS, WORKER_COLOR_PALETTE } from '@styles/colors';
import { normalizeWorkerId } from '@utils/workers';

export const generateStackColors = (count: number, theme: Theme): string[] => {
  const bases = SHARENOTE_STACK_COLORS;
  const soft = (c: string) => (theme.palette.mode === 'dark' ? lighten(c, 0.12) : lighten(c, 0.06));
  const result: string[] = [];
  for (let i = 0; i < Math.min(count, bases.length); i++) result.push(soft(bases[i]));
  if (result.length >= count) return result;

  const needed = count - result.length;
  const s = theme.palette.mode === 'dark' ? 55 : 60;
  const l = theme.palette.mode === 'dark' ? 55 : 52;
  const goldenAngle = 137.508;
  for (let i = 0; i < needed; i++) {
    const hue = (i * goldenAngle) % 360;
    result.push(`hsl(${hue.toFixed(1)}, ${s}%, ${l}%)`);
  }
  return result;
};

export const getWorkerPalette = (_theme: Theme): string[] => {
  return WORKER_COLOR_PALETTE.length > 0 ? WORKER_COLOR_PALETTE : SHARENOTE_STACK_COLORS;
};

const workerColorAssignments: Record<string, string> = {};
let workerColorPointer = 0;

export const ensureWorkerColors = (theme: Theme, workerIds: string[]) => {
  const palette = getWorkerPalette(theme);
  workerIds
    .map((id) => normalizeWorkerId(id))
    .filter((id) => !!id)
    .forEach((id) => {
      const key = id.trim().toLowerCase();
      if (!key) return;
      if (!workerColorAssignments[key]) {
        const color = palette[workerColorPointer % palette.length] ?? theme.palette.primary.main;
        workerColorAssignments[key] = color;
        workerColorPointer += 1;
      }
    });
  return workerColorAssignments;
};

export const getWorkerColor = (theme: Theme, workerId: string): string => {
  const palette = getWorkerPalette(theme);
  const normalized = normalizeWorkerId(workerId);
  if (!normalized) {
    return palette[0] ?? theme.palette.primary.main;
  }

  const key = normalized.trim().toLowerCase();
  if (!key) {
    return palette[0] ?? theme.palette.primary.main;
  }

  if (!workerColorAssignments[key]) ensureWorkerColors(theme, [key]);

  return workerColorAssignments[key];
};
