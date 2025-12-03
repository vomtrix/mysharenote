import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainIconPath, getChainMetadata, getChainName } from '@constants/chainIcons';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IShareEvent } from '@objects/interfaces/IShareEvent';
import { getAddress, getIsSharesLoading, getShares } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { aggregateSharesByInterval } from '@utils/aggregators';
import { ensureWorkerColors, getWorkerColor, getWorkerPalette } from '@utils/colors';
import { normalizeWorkerId } from '@utils/workers';

type Props = {
  intervalMinutes?: number; // default 60 min
};

const WorkersProfit = ({ intervalMinutes = 60 }: Props) => {
  const { t } = useTranslation();
  const shares = useSelector(getShares) as IShareEvent[];
  const isLoading = useSelector(getIsSharesLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const intervalSec = Math.max(1, Math.floor(intervalMinutes * 60));
  const windowSec = 24 * 60 * 60;

  const normalizeChainKey = useCallback(
    (chainId?: string) => getChainName(chainId) ?? chainId?.trim().toLowerCase() ?? 'flokicoin',
    []
  );

  const toTitleCase = (value?: string) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const { chainOptions, defaultChain } = useMemo(() => {
    const buckets = new Map<
      string,
      { totalAmount: number; count: number; sampleChainId?: string }
    >();

    (shares || []).forEach((share) => {
      const chainKey = normalizeChainKey(share.chainId);
      const entry = buckets.get(chainKey) ?? { totalAmount: 0, count: 0 };
      entry.totalAmount += share.amount || 0;
      entry.count += 1;
      entry.sampleChainId = entry.sampleChainId ?? share.chainId;
      buckets.set(chainKey, entry);
    });

    const sorted = Array.from(buckets.entries()).sort((a, b) => {
      if (b[1].totalAmount !== a[1].totalAmount) return b[1].totalAmount - a[1].totalAmount;
      return b[1].count - a[1].count;
    });

    const options = sorted.map(([value, stats]) => {
      const meta = getChainMetadata(value);
      const labelName = toTitleCase(meta?.name ?? value);
      const label = labelName || t('liveSharenotes.unknownChain');
      const icon = getChainIconPath(value) ?? getChainIconPath(stats.sampleChainId);
      return { value, label, icon, meta };
    });

    return { chainOptions: options, defaultChain: sorted[0]?.[0] };
  }, [shares, t, normalizeChainKey]);

  const [selectedChain, setSelectedChain] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!chainOptions.length) {
      if (selectedChain !== undefined) {
        setSelectedChain(undefined);
      }
      return;
    }
    const active = selectedChain ?? defaultChain ?? chainOptions[0]?.value;
    const exists = chainOptions.some((option) => option.value === active);
    if (!exists && defaultChain) {
      setSelectedChain(defaultChain);
    } else if (!selectedChain && active) {
      setSelectedChain(active);
    }
  }, [chainOptions, defaultChain, selectedChain]);

  const activeChain = selectedChain ?? defaultChain;
  const activeChainMeta = getChainMetadata(activeChain);
  const currencySymbol = activeChainMeta?.currencySymbol || '';
  const decimals = Math.max(0, activeChainMeta?.decimals ?? 8);
  const precision = Math.min(8, decimals);
  const divisor = 10 ** decimals;

  const filteredShares = useMemo(() => {
    const positiveShares = (shares || []).filter((share) => (share.amount ?? 0) > 0);
    if (!activeChain) return positiveShares;
    return positiveShares.filter((share) => normalizeChainKey(share.chainId) === activeChain);
  }, [shares, activeChain, normalizeChainKey]);
  const normalizedShares = useMemo(
    () =>
      filteredShares.map((share) => ({
        ...share,
        workerId: normalizeWorkerId(share.workerId)
      })),
    [filteredShares]
  );
  const workerSubNameMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredShares.forEach((share) => {
      const baseId = normalizeWorkerId(share.workerId);
      const rawWorker = String(share.workerId ?? '').trim();
      const parts = rawWorker.split('#');
      const subName = parts.length > 1 ? parts.slice(1).join('#').trim() : '';
      if (!subName) return;
      const current = map.get(baseId);
      if (!current || subName.localeCompare(current) < 0) {
        map.set(baseId, subName);
      }
    });
    return map;
  }, [filteredShares]);
  const workerTotals = useMemo(() => {
    const totals = new Map<string, number>();
    normalizedShares.forEach((share) => {
      const key = String(share.workerId ?? '');
      const amt = Number(share.amount ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) return;
      totals.set(key, (totals.get(key) ?? 0) + amt);
    });
    return totals;
  }, [normalizedShares]);
  const workerColorMap = useMemo(() => {
    const palette = getWorkerPalette(theme);
    const sortedWorkers = Array.from(workerTotals.entries())
      .filter(([, total]) => total > 0)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        const subA = workerSubNameMap.get(a[0]) ?? a[0];
        const subB = workerSubNameMap.get(b[0]) ?? b[0];
        return subA.localeCompare(subB);
      });
    ensureWorkerColors(theme, sortedWorkers.map(([id]) => id));
    const map = new Map<string, string>();
    sortedWorkers.forEach(([id], index) => {
      const color = getWorkerColor(theme, id) ?? palette[index % palette.length];
      map.set(id, color ?? theme.palette.primary.main);
    });
    return map;
  }, [theme, workerSubNameMap, workerTotals]);

  const { xLabels, workers, dataByWorker } = useMemo(
    () =>
      aggregateSharesByInterval(normalizedShares || [], intervalSec, windowSec, undefined, {
        fallbackToLatest: true
      }),
    [normalizedShares, intervalSec]
  );
  const series = useMemo(() => {
    const mapped = workers.reduce<
      Array<{ id: string; label: string; data: number[]; color: string; stack: string }>
    >((acc, w, i) => {
      if ((workerTotals.get(w) ?? 0) <= 0) return acc;
      const workerData = dataByWorker[i] ?? [];
      const hasProfit = workerData.some(
        (value) => typeof value === 'number' && !Number.isNaN(value) && value > 0
      );
      if (!hasProfit) return acc;
      acc.push({
        id: w,
        label: w,
        data: workerData,
        color: workerColorMap.get(w) ?? getWorkerColor(theme, w),
        stack: 'shares'
      });
      return acc;
    }, [] as any[]);
    return mapped;
  }, [workers, dataByWorker, theme, workerTotals, workerColorMap]);

  const hasData = xLabels.length > 0 && series.length > 0;

  const formatShareValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const formatted = (value / divisor).toFixed(precision);
    return currencySymbol ? `${formatted} ${currencySymbol}` : formatted;
  };
  const formatShareValueNumber = (value: number) =>
    currencySymbol
      ? `${(value / divisor).toFixed(precision)} ${currencySymbol}`
      : (value / divisor).toFixed(precision);
  const inlineLegendSlotProps = {
    direction: 'horizontal' as const,
    position: { vertical: 'top' as const, horizontal: 'start' as const },
    padding: { top: 4, bottom: 4 },
    itemGap: 2,
    labelStyle: { whiteSpace: 'nowrap' }
  };
  const inlineLegendSx = {
    '& .MuiChartsLegend-root': {
      flexWrap: 'nowrap',
      overflowX: 'auto',
      overflowY: 'hidden',
      width: '100%',
      justifyContent: 'center',
      gap: 2,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none' }
    },
    '& .MuiChartsLegend-series': {
      whiteSpace: 'nowrap'
    }
  };

  return (
    <StyledCard sx={{
        height: { xs: 'auto', lg: 420 },
        minHeight: '100%',
      }}>
      <Box
        component="section"
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
        <SectionHeader
          sx={{
            display: 'flex',
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap'
          }}>
          <InfoHeader title={t('workersProfit')} tooltip={t('info.workersProfit')} />
          {chainOptions.length > 0 ? (
            <Box
              sx={{
                width: 'auto',
                minWidth: 'fit-content',
                maxWidth: { xs: 220, sm: 240 },
                flexShrink: 0,
                flexGrow: 0
              }}>
              <Select
                value={activeChain ?? ''}
                onChange={(event) => setSelectedChain(String(event.target.value))}
                size="small"
                displayEmpty
                MenuProps={{
                  PaperProps: {
                    sx: { maxHeight: 320 }
                  }
                }}
                variant="outlined"
                sx={{
                  width: 'fit-content',
                  maxWidth: { xs: 220, sm: 240 },
                  ml: { xs: 0, md: 'auto' },
                  bgcolor: 'transparent',
                  borderRadius: 1,
                  boxShadow: 'none',
                  '.MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.65,
                    py: { xs: 0.55, sm: 0.7 },
                    px: { xs: 0.95, sm: 1.2 },
                    fontWeight: 700,
                    minHeight: 36,
                    backgroundColor: 'transparent'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
                renderValue={(value) => {
                  const option = chainOptions.find((opt) => opt.value === value);
                  if (!option) return t('liveSharenotes.unknownChain');
                  return (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.65}
                      overflow="hidden"
                      width="100%">
                      {option.icon ? (
                        <Avatar
                          src={option.icon}
                          alt={option.label}
                          variant="rounded"
                          sx={{ width: 22, height: 22 }}
                        />
                      ) : null}
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
                        {option.label}
                      </Typography>
                    </Box>
                  );
                }}>
                {chainOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {option.icon ? (
                        <Avatar
                          src={option.icon}
                          alt={option.label}
                          variant="rounded"
                          sx={{ width: 24, height: 24 }}
                        />
                      ) : null}
                      <Box display="flex" flexDirection="column" gap={0.25}>
                        <Typography variant="body2" fontWeight={700}>
                          {option.label}
                        </Typography>
                        {option.meta?.currencySymbol ? (
                          <Typography variant="caption" color="text.secondary">
                            {option.meta.currencySymbol}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          ) : null}
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={shares.length} />}
        {!isLoading &&
          (hasData && address ? (
            <Box
              sx={{
                width: '100%',
                flexGrow: 1,
                display: 'flex',
                minHeight: 0,
                maxHeight: { xs: 300, lg: 'unset' },
                height: { xs: 300, lg: 'unset' },
                ...inlineLegendSx
              }}>
              <BarChart
                series={series.map((s) => ({
                  ...s,
                  valueFormatter: formatShareValue
                }))}
                xAxis={[
                  {
                    scaleType: 'band',
                    data: xLabels,
                    // slightly larger for readability
                    tickLabelStyle: { fontSize: 12 }
                  }
                ]}
                yAxis={[{ position: 'none' }]}
                margin={{ bottom: 0, left: 10, right: 10, top: 20 }}
                slots={{ tooltip: StackedTotalTooltip as any }}
                slotProps={{
                  legend: inlineLegendSlotProps,
                  tooltip: {
                    trigger: 'axis',
                    anchor: 'pointer',
                    placement: isMobile ? 'top' : undefined,
                    valueFormatter: formatShareValueNumber
                  } as any
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                minHeight: '45px',
                flexGrow: 1
              }}>
              No data
            </Box>
          ))}
      </Box>
    </StyledCard>
  );
};

export default WorkersProfit;
