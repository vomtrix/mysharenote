export const normalizeWorkerId = (workerId?: string | null) => {
  const baseId = String(workerId ?? '')
    .split('#')[0]
    ?.trim();
  return baseId || 'unknown';
};
