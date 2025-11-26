import type { LineData, UTCTimestamp } from 'lightweight-charts';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BoltIcon from '@mui/icons-material/Bolt';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import Box from '@mui/material/Box';
import { alpha as muiAlpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import CustomChart from '@components/common/CustomChart';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import { getAddress, getHashrates, getIsHashratesLoading } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { getWorkerColor } from '@utils/colors';
import { formatHashrate } from '@utils/helpers';

const METRIC_STORAGE_KEY = 'hashrateMetricPreference';
const WORKER_STORAGE_KEY = 'hashrateSelectedWorker';

type HashrateMetric = 'live' | 'emaShort' | 'emaLong';
const SHORT_EMA_PERIOD = 10;
const LONG_EMA_PERIOD = 30;

const HashrateChart = () => {
  const { t } = useTranslation();
  const hashrates = useSelector(getHashrates) as IHashrateEvent[];
  const isLoading = useSelector(getIsHashratesLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedWorker, setSelectedWorker] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    const stored = window.localStorage.getItem(WORKER_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : 'all';
  });
  const [hashrateMetric, setHashrateMetric] = useState<HashrateMetric>(() => {
    if (typeof window === 'undefined') return 'live';
    const stored = window.localStorage.getItem(METRIC_STORAGE_KEY);
    if (stored === 'emaShort' || stored === 'emaLong' || stored === 'live') {
      return stored;
    }
    return 'live';
  });

  const availableWorkers = useMemo(() => {
    const workers = new Set<string>();
    let hasAggregate = false;

    (hashrates || []).forEach((event) => {
      if (typeof event?.hashrate === 'number' && !Number.isNaN(event.hashrate)) {
        hasAggregate = true;
      }
      if (event?.workers) {
        Object.keys(event.workers).forEach((key) => {
          if (key) workers.add(key);
        });
      } else if (event?.worker) {
        workers.add(event.worker);
      }
    });

    const sortedWorkers = Array.from(workers).sort((a, b) => a.localeCompare(b));
    if (hasAggregate && !sortedWorkers.includes('all')) {
      sortedWorkers.unshift('all');
    }

    return sortedWorkers.length ? sortedWorkers : ['all'];
  }, [hashrates]);

  const metricOptions = useMemo(
    () => [
      {
        value: 'live' as HashrateMetric,
        label: t('hashrateModes.live', { defaultValue: 'Live' }),
        Icon: BoltIcon
      },
      {
        value: 'emaShort' as HashrateMetric,
        label: t('hashrateModes.emaShort', { defaultValue: 'EMA (Fast)' }),
        Icon: SsidChartIcon
      },
      {
        value: 'emaLong' as HashrateMetric,
        label: t('hashrateModes.emaLong', { defaultValue: 'EMA (Slow)' }),
        Icon: TimelineIcon
      }
    ],
    [t]
  );

  const handleMetricChange = (
    _event: MouseEvent<HTMLElement> | null,
    value: HashrateMetric | null
  ) => {
    if (!value || value === hashrateMetric) return;
    setHashrateMetric(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(METRIC_STORAGE_KEY, value);
    }
  };

  const workerMetricSummaries = useMemo(() => {
    if (!hashrates?.length) {
      return new Map<string, { live?: number; emaShort?: number; emaLong?: number }>();
    }

    const sortedEvents = [...hashrates]
      .filter((event): event is IHashrateEvent => !!event && typeof event.timestamp === 'number')
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    const alphaShort = 2 / (SHORT_EMA_PERIOD + 1);
    const alphaLong = 2 / (LONG_EMA_PERIOD + 1);
    const metricsMap = new Map<string, { live?: number; emaShort?: number; emaLong?: number }>();

    const updateWorker = (workerId: string, rawValue: number | undefined) => {
      if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) return;
      const previous = metricsMap.get(workerId);
      const emaShort =
        previous?.emaShort === undefined
          ? rawValue
          : alphaShort * rawValue + (1 - alphaShort) * previous.emaShort;
      const emaLong =
        previous?.emaLong === undefined
          ? rawValue
          : alphaLong * rawValue + (1 - alphaLong) * previous.emaLong;
      metricsMap.set(workerId, { live: rawValue, emaShort, emaLong });
    };

    sortedEvents.forEach((event) => {
      if (typeof event.hashrate === 'number' && !Number.isNaN(event.hashrate)) {
        updateWorker('all', event.hashrate);
      }

      const workerIds = new Set<string>();
      if (event.workerDetails) {
        Object.keys(event.workerDetails).forEach((worker) => {
          if (worker) workerIds.add(worker);
        });
      }
      if (event.workers) {
        Object.keys(event.workers).forEach((worker) => {
          if (worker) workerIds.add(worker);
        });
      }
      if (event.worker) {
        workerIds.add(event.worker);
      }

      workerIds.forEach((workerId) => {
        const detailValue = event.workerDetails?.[workerId]?.hashrate;
        const workersValue = event.workers?.[workerId];
        let resolvedValue: number | undefined;
        if (typeof detailValue === 'number' && Number.isFinite(detailValue)) {
          resolvedValue = detailValue;
        } else if (typeof workersValue === 'number' && Number.isFinite(workersValue)) {
          resolvedValue = workersValue;
        } else if (
          event.worker === workerId &&
          typeof event.hashrate === 'number' &&
          Number.isFinite(event.hashrate)
        ) {
          resolvedValue = event.hashrate;
        }

        updateWorker(workerId, resolvedValue);
      });
    });

    return metricsMap;
  }, [hashrates]);

  const visibleWorkers = useMemo(() => {
    return availableWorkers.filter((worker) => {
      if (worker === 'all') return true;
      const liveValue = workerMetricSummaries.get(worker)?.live;
      return typeof liveValue === 'number' && liveValue > 0;
    });
  }, [availableWorkers, workerMetricSummaries]);

  useEffect(() => {
    if (!visibleWorkers.includes(selectedWorker)) {
      const fallbackWorker = visibleWorkers.includes('all') ? 'all' : visibleWorkers[0];
      if (!fallbackWorker) return;
      setSelectedWorker(fallbackWorker);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(WORKER_STORAGE_KEY, fallbackWorker);
      }
    }
  }, [selectedWorker, visibleWorkers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWorker = window.localStorage.getItem(WORKER_STORAGE_KEY);
    if (!storedWorker) {
      window.localStorage.setItem(WORKER_STORAGE_KEY, selectedWorker);
    }
  }, [selectedWorker]);

  const workerColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    visibleWorkers.forEach((worker) => {
      colorMap[worker] =
        worker === 'all' ? theme.palette.primary.main : getWorkerColor(theme, worker);
    });
    return colorMap;
  }, [theme, visibleWorkers]);

  type WorkerDataPoint = LineData<UTCTimestamp>;

  const workerDataPoints = useMemo<WorkerDataPoint[]>(() => {
    const tzOffsetSeconds = new Date().getTimezoneOffset() * 60;
    return (hashrates || [])
      .map((event) => {
        const timestamp =
          typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)
            ? (Math.round(event.timestamp - tzOffsetSeconds) as UTCTimestamp)
            : null;
        const baseValue =
          selectedWorker === 'all'
            ? event.hashrate
            : (event.workers?.[selectedWorker] ??
              (event.worker === selectedWorker ? event.hashrate : undefined));
        if (
          timestamp === null ||
          Number.isNaN(timestamp) ||
          typeof baseValue !== 'number' ||
          Number.isNaN(baseValue)
        )
          return null;

        return {
          time: timestamp,
          value: baseValue
        };
      })
      .filter((point): point is WorkerDataPoint => point !== null)
      .sort((a, b) => a.time - b.time);
  }, [hashrates, selectedWorker]);

  const chartDataPoints = useMemo<LineData<UTCTimestamp>[]>(() => {
    if (workerDataPoints.length === 0) return [];
    if (hashrateMetric === 'live') {
      return workerDataPoints.map(({ time, value }) => ({ time, value }));
    }
    const period = hashrateMetric === 'emaShort' ? SHORT_EMA_PERIOD : LONG_EMA_PERIOD;
    const alpha = 2 / (period + 1);
    let previous: number | undefined;
    return workerDataPoints.map(({ time, value }) => {
      const ema = previous === undefined ? value : alpha * value + (1 - alpha) * previous;
      previous = ema;
      return { time, value: ema };
    });
  }, [hashrateMetric, workerDataPoints]);

  const selectedColor = workerColors[selectedWorker] || theme.palette.primary.main;
  const areaTopColor = muiAlpha(selectedColor, theme.palette.mode === 'dark' ? 0.3 : 0.18);
  const areaBottomColor = muiAlpha(selectedColor, 0.06);
  const hasChartData = chartDataPoints.length > 0 && !!address;
  const toggleDisabled = !hasChartData;
  const selectedMetricIndex = Math.max(
    metricOptions.findIndex((opt) => opt.value === hashrateMetric),
    0
  );
  const highlightWidth = `${100 / metricOptions.length}%`;
  const highlightLeft = `${(selectedMetricIndex / metricOptions.length) * 100}%`;

  return (
    <StyledCard
      sx={{
        boxShadow: '0 15px 45px -35px rgba(40, 40, 125, 0.45)',
        height: { xs: 'auto', lg: 'auto' },
        display: 'flex',
        flexDirection: 'column'
      }}>
      <Box
        component="section"
        sx={{
          pt: 2,
          px: 2,
          pb: { xs: 2, lg: 0 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
        <SectionHeader
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap'
          }}>
          <InfoHeader title={t('hashrateChart')} tooltip={t('info.hashrateChart')} />
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: `repeat(${metricOptions.length}, 1fr)`,
              gap: 0,
              borderRadius: 999,
              px: { xs: 0.25, sm: 0.4 },
              py: { xs: 0.28, sm: 0.3 },
              minWidth: { xs: 0, sm: 240 },
              width: 'auto',
              background: muiAlpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.14 : 0.06
              ),
              border: 'none',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 6px 18px -14px ${muiAlpha(theme.palette.common.black, 0.7)}`
                  : `0 10px 28px -20px ${muiAlpha(theme.palette.primary.main, 0.55)}`,
              backdropFilter: 'blur(8px)',
              overflow: 'hidden',
              opacity: toggleDisabled ? 0.65 : 1
            }}>
            {!toggleDisabled && (
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 3.2, sm: 4 },
                  bottom: { xs: 3.2, sm: 4 },
                  left: highlightLeft,
                  width: highlightWidth,
                  background:
                    theme.palette.mode === 'dark'
                      ? muiAlpha(theme.palette.primary.contrastText, 0.28)
                      : muiAlpha(theme.palette.primary.main, 0.22),
                  borderRadius: 999,
                  transition: 'left 220ms ease, width 220ms ease, background 220ms ease',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? `0 8px 18px -12px ${muiAlpha(theme.palette.primary.contrastText, 0.5)}`
                      : `0 10px 20px -14px ${muiAlpha(theme.palette.primary.main, 0.55)}`
                }}
              />
            )}
            {metricOptions.map(({ value, label, Icon }) => {
              const isSelected = value === hashrateMetric;
              const showLabel = !isCompact;
              const contentColor = toggleDisabled
                ? muiAlpha(theme.palette.text.disabled, 0.85)
                : theme.palette.mode === 'dark'
                  ? muiAlpha(theme.palette.primary.contrastText, isSelected ? 0.95 : 0.75)
                  : muiAlpha(theme.palette.primary.main, isSelected ? 0.92 : 0.75);

              return (
                <Box
                  key={value}
                  component="button"
                  type="button"
                  onClick={() => {
                    if (toggleDisabled || value === hashrateMetric) return;
                    handleMetricChange(null, value);
                  }}
                  disabled={toggleDisabled}
                  aria-pressed={isSelected}
                  aria-label={label}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (!toggleDisabled && value !== hashrateMetric) {
                        handleMetricChange(null, value);
                      }
                    }
                  }}
                  sx={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: showLabel ? { xs: 0.35, sm: 0.4 } : 0,
                    padding: showLabel
                      ? { xs: '7px 10px', sm: '6px 10px' }
                      : { xs: '7px 8px', sm: '6px 8px' },
                    fontFamily: 'inherit',
                    cursor: toggleDisabled ? 'not-allowed' : 'pointer',
                    color: contentColor,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition: 'color 180ms ease, transform 180ms ease',
                    '&:focus-visible': {
                      outline: 'none',
                      color:
                        theme.palette.mode === 'dark'
                          ? theme.palette.primary.contrastText
                          : theme.palette.primary.main,
                      transform: 'translateY(-1px)'
                    },
                    '&:hover': {
                      color:
                        toggleDisabled || isSelected
                          ? contentColor
                          : theme.palette.mode === 'dark'
                            ? muiAlpha(theme.palette.primary.contrastText, 0.95)
                            : muiAlpha(theme.palette.primary.main, 0.9)
                    }
                  }}>
                  <Icon sx={{ fontSize: { xs: '1rem', sm: '0.95rem' } }} />
                  {showLabel && (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: { xs: '0.7rem', sm: '0.72rem' },
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                      {label}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </SectionHeader>
        {!isLoading && hasChartData && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              columnGap: 2,
              rowGap: 1.5,
              pb: chartDataPoints.length > 0 ? 2 : 0.5,
              overflowX: 'auto',
              width: '100%',
              pr: 1,
              scrollSnapType: 'x mandatory',
              '& > *': {
                scrollSnapAlign: 'start'
              }
            }}>
            {visibleWorkers.map((worker) => {
              const color = workerColors[worker] || theme.palette.primary.main;
              const isSelected = worker === selectedWorker;
              const metrics = workerMetricSummaries.get(worker);
              const workerHashrateRaw =
                hashrateMetric === 'emaShort'
                  ? metrics?.emaShort
                  : hashrateMetric === 'emaLong'
                    ? metrics?.emaLong
                    : metrics?.live;
              const formattedHashrate =
                typeof workerHashrateRaw === 'number' && !Number.isNaN(workerHashrateRaw)
                  ? formatHashrate(workerHashrateRaw)
                  : '--';
              return (
                <Box
                  key={worker}
                  onClick={() => {
                    setSelectedWorker(worker);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(WORKER_STORAGE_KEY, worker);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedWorker(worker);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(WORKER_STORAGE_KEY, worker);
                      }
                    }
                  }}
                  sx={{
                    position: 'relative',
                    px: 1.5,
                    py: 0.75,
                    cursor: 'pointer',
                    color: theme.palette.text.primary,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: '999px',
                    backgroundColor: isSelected ? muiAlpha(color, 0.1) : muiAlpha(color, 0.04),
                    transition:
                      'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      backgroundColor: muiAlpha(color, isSelected ? 0.16 : 0.08)
                    },
                    '&:focus-visible': {
                      outline: 'none',
                      backgroundColor: muiAlpha(color, 0.2)
                    }
                  }}>
                  <Box
                    component="span"
                    sx={{
                      width: isSelected ? 12 : 10,
                      height: isSelected ? 12 : 10,
                      borderRadius: '50%',
                      backgroundColor: color,
                      boxShadow: isSelected
                        ? `0 0 0 6px ${muiAlpha(color, 0.18)}, 0 0 25px ${muiAlpha(color, 0.35)}`
                        : `0 0 0 2px ${muiAlpha(color, 0.12)}`,
                      transition: 'all 220ms ease'
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 600 : 400,
                      letterSpacing: '0.02em'
                    }}>
                    {worker === 'all' ? t('hashrateFilter.all') : worker}
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        fontSize: '0.75rem',
                        opacity: 0.75,
                        color: isSelected
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary
                      }}>
                      {formattedHashrate}
                    </Box>
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
        {isLoading && address && <ProgressLoader value={hashrates.length} />}
        {!isLoading &&
          (hasChartData ? (
            <CustomChart
              dataPoints={chartDataPoints}
              height={300}
              lineColor={selectedColor}
              areaTopColor={areaTopColor}
              areaBottomColor={areaBottomColor}
              legendColor={selectedColor}
              valueFormatter={formatHashrate}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '45px',
                fontSize: '0.9rem',
                flexGrow: 1
              }}>
              No data
            </Box>
          ))}
      </Box>
    </StyledCard>
  );
};

export default HashrateChart;
