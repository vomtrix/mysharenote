import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { combineNotesSerial, noteFromZBits, Sharenote } from '@soprinter/sharenotejs';
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

  return undefined;
};

const SOLVED_BAR_COLOR = '#FFD700';

const formatNumber = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '--';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const toLinearValue = (note?: Sharenote) => {
  if (!note || !Number.isFinite(note.zBits)) return 0;
  const linear = Math.pow(2, note.zBits);
  return Number.isFinite(linear) ? linear : 0;
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
    const baseBlockMap = new Map<number, Map<string, Sharenote>>();
    const solvedBlockTotals = new Map<number, Sharenote>();

    visibleSharenotes.forEach((event) => {
      if (typeof event.blockHeight !== 'number' || !Number.isFinite(event.blockHeight)) return;
      const workerId = event.worker ?? event.workerId ?? 'unknown';
      const deltaNote = toSharenote(event);
      if (!deltaNote) return;
      if (!Number.isFinite(deltaNote.zBits) || deltaNote.zBits === 0) return;

      if (event.solved) {
        const existing = solvedBlockTotals.get(event.blockHeight);
        const combined = existing ? combineNotesSerial([existing, deltaNote]) : deltaNote;
        solvedBlockTotals.set(event.blockHeight, combined);
        return;
      }

      const workerSum = baseBlockMap.get(event.blockHeight) ?? new Map<string, Sharenote>();
      const existing = workerSum.get(workerId);
      const combined = existing ? combineNotesSerial([existing, deltaNote]) : deltaNote;
      workerSum.set(workerId, combined);
      baseBlockMap.set(event.blockHeight, workerSum);
    });

    const blockHeights = Array.from(
      new Set<number>([...baseBlockMap.keys(), ...solvedBlockTotals.keys()])
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
        data: blockHeights.map((height) => toLinearValue(baseBlockMap.get(height)?.get(workerId))),
        color: getWorkerColor(theme, workerId),
        stack: 'liveSharenotes'
      }))
      .filter((series) => series.data.some((value) => value > 0));

    const solvedData = blockHeights.map((height) => toLinearValue(solvedBlockTotals.get(height)));
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

  const formatChartValue = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
      return '--';
    }
    const zBits = Math.log2(value);
    return `${formatNumber(zBits)} zBits`;
  };

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
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              display: 'flex'
            }}>
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
              <Box
                sx={{
                  width: '100%',
                  flexGrow: 1,
                  minHeight: 0,
                  display: 'flex'
                }}>
                <BarChart
                  sx={{ flexGrow: 1, minHeight: 0 }}
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
