import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { noteFromZBits, parseNoteLabel, Sharenote } from '@soprinter/sharenotejs';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { getIsLiveSharenotesLoading, getLiveSharenotes } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { getWorkerColor } from '@utils/colors';

const toSharenote = (event: ILiveSharenoteEvent): Sharenote | undefined => {
  if (typeof event.zBits === 'number' && Number.isFinite(event.zBits)) {
    try {
      return noteFromZBits(event.zBits);
    } catch {
      // ignore invalid conversions
    }
  }

  const rawLabel = event.sharenote ?? event.zLabel;
  const labelCandidate =
    typeof rawLabel === 'string'
      ? rawLabel
      : rawLabel !== undefined && rawLabel !== null
        ? String(rawLabel)
        : undefined;
  if (labelCandidate && typeof labelCandidate === 'string' && labelCandidate.trim().length > 0) {
    try {
      return parseNoteLabel(labelCandidate.trim());
    } catch {
      // ignore parsing failures
    }
  }

  return undefined;
};

const SOLVED_BAR_COLOR = '#FFD700';

const formatNumber = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '--';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const LiveSharenotes = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const liveSharenotes = useSelector(getLiveSharenotes);
  const isLoading = useSelector(getIsLiveSharenotesLoading);

  const visibleSharenotes = useMemo(
    () => [...liveSharenotes].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [liveSharenotes]
  );

  const shareCount = visibleSharenotes.length;

  const liveChartData = useMemo(() => {
    const baseBlockMap = new Map<number, Map<string, number>>();
    const solvedBlockTotals = new Map<number, number>();

    visibleSharenotes.forEach((event) => {
      if (typeof event.blockHeight !== 'number' || !Number.isFinite(event.blockHeight)) return;
      const workerId = event.worker ?? event.workerId ?? 'unknown';
      const note = toSharenote(event);
      const delta =
        typeof note?.zBits === 'number' && Number.isFinite(note.zBits)
          ? note.zBits
          : typeof event.zBits === 'number' && Number.isFinite(event.zBits)
            ? event.zBits
            : 0;
      if (!Number.isFinite(delta) || delta === 0) return;

      if (event.solved) {
        solvedBlockTotals.set(
          event.blockHeight,
          (solvedBlockTotals.get(event.blockHeight) ?? 0) + delta
        );
        return;
      }

      const workerSum = baseBlockMap.get(event.blockHeight) ?? new Map<string, number>();
      workerSum.set(workerId, (workerSum.get(workerId) ?? 0) + delta);
      baseBlockMap.set(event.blockHeight, workerSum);
    });

    const blockHeights = Array.from(
      new Set<number>([
        ...baseBlockMap.keys(),
        ...solvedBlockTotals.keys()
      ])
    ).sort((a, b) => a - b);

    if (!blockHeights.length) {
      return { blockLabels: [], series: [] as Array<Record<string, any>> };
    }

    const workerIds = Array.from(
      baseBlockMap.values().reduce<Set<string>>((acc, map) => {
        map.forEach((_value, worker) => acc.add(worker));
        return acc;
      }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b));

    const blockLabels = blockHeights.map((height) => `#${height}`);

    const baseSeries = workerIds
      .map((workerId) => ({
        id: workerId,
        label: workerId === 'unknown' ? t('worker') : workerId,
        data: blockHeights.map((height) => baseBlockMap.get(height)?.get(workerId) ?? 0),
        color: getWorkerColor(theme, workerId),
        stack: 'liveSharenotes'
      }))
      .filter((series) => series.data.some((value) => value > 0));

    const solvedData = blockHeights.map((height) => solvedBlockTotals.get(height) ?? 0);
    const series: Array<Record<string, any>> = [...baseSeries];
    if (solvedData.some((value) => value > 0)) {
      series.push({
        id: 'solved',
        label: t('liveSharenotes.solved'),
        data: solvedData,
        color: SOLVED_BAR_COLOR,
        stack: 'liveSharenotes'
      });
    }

    return { blockLabels, series };
  }, [visibleSharenotes, t, theme]);

  const hasLiveChartData = liveChartData.blockLabels.length > 0 && liveChartData.series.length > 0;

  const formatChartValue = (value?: number | null) =>
    value === null || value === undefined || Number.isNaN(value)
      ? '--'
      : `${formatNumber(value)} zBits`;

  const chartSeries = liveChartData.series.map((series) => ({
    ...series,
    valueFormatter: formatChartValue
  }));

  return (
    <StyledCard
      sx={{
        height: { xs: 'auto', lg: 360 },
        mb: { xs: 3, lg: 0 }
      }}>
      <Box
        component="section"
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
        <SectionHeader sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
          <InfoHeader title={t('liveSharenotes')} tooltip={t('info.liveSharenotes')} />
        </SectionHeader>
        <Box
          sx={{
            flexGrow: 1,
            mt: 2,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            {isLoading ? (
              <ProgressLoader value={shareCount} />
            ) : !hasLiveChartData ? (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  minHeight: 0,
                  flexGrow: 1
                }}>
                {t('liveSharenotes.empty')}
              </Box>
            ) : (
              <Box sx={{ width: '100%', flexGrow: 1, minHeight: 0 }}>
                <BarChart
                  series={chartSeries}
                  xAxis={[
                    {
                      scaleType: 'band',
                      data: liveChartData.blockLabels,
                      tickLabelStyle: { fontSize: 11 }
                    }
                  ]}
                  yAxis={[{ position: 'none' }]}
                  margin={{ bottom: 0, left: 10, right: 10, top: 16 }}
                  slots={{ tooltip: StackedTotalTooltip as any }}
                  slotProps={{
                    tooltip: { trigger: 'axis', valueFormatter: formatChartValue } as any
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </StyledCard>
  );
};

export default LiveSharenotes;
