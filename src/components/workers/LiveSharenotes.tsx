import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainIconPath, getChainName } from '@constants/chainIcons';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import type { BarSeries } from '@mui/x-charts/BarChart';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import {
  combineNotesSerial,
  noteFromZBits,
  parseNoteLabel,
  Sharenote
} from '@soprinter/sharenotejs';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IAuxiliaryBlock, ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import {
  getIsLiveSharenotesLoading,
  getLiveSharenotes,
  getShares
} from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { ensureWorkerColors, getWorkerColor } from '@utils/colors';
import { formatSharenoteLabel } from '@utils/helpers';
import { formatRelativeFromTimestamp } from '@utils/time';
import { normalizeWorkerId } from '@utils/workers';

const toSharenote = (event: ILiveSharenoteEvent): Sharenote | undefined => {
  if (typeof event.zBits === 'string' && event.zBits.trim()) {
    try {
      return parseNoteLabel(event.zBits);
    } catch {
      // ignore invalid labels
    }
  }

  if (typeof event.zBits === 'number' && Number.isFinite(event.zBits)) {
    try {
      return noteFromZBits(event.zBits);
    } catch {
      // ignore invalid conversions
    }
  }

  return undefined;
};

const MAX_LIVE_BLOCKS_DESKTOP = 40;
const MAX_LIVE_BLOCKS_MOBILE = 15;
const LIVE_SHARENOTE_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5m
const NEW_SHARENOTE_HIGHLIGHT_MS = 2000;

const toLinearValue = (note?: Sharenote) => {
  if (!note || !Number.isFinite(note.zBits)) return 0;
  const linear = Math.pow(2, note.zBits);
  return Number.isFinite(linear) ? linear : 0;
};

const formatLinearValueAsSharenoteLabel = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return '--';
  }
  const zBits = Math.log2(value);
  return formatSharenoteLabel(zBits) || '--';
};

const formatLastEventAge = (timestamp?: number | null) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return undefined;
  }
  const formatted = formatRelativeFromTimestamp(timestamp);
  return formatted === '--' ? undefined : formatted;
};

type LiveBarSeries = Omit<BarSeries, 'data' | 'id'> & {
  id: string | number;
  data: Array<number | null>;
};

type LiveChartData = {
  blockHeights: number[];
  blockLabels: string[];
  series: LiveBarSeries[];
  blockEventCounts: Record<string, number>;
  blockSeriesCounts: Record<string, Record<string, number>>;
  workerTotals: Array<{ workerId: string; total: number; color: string }>;
};

const resolveEventPrimaryChain = (event: ILiveSharenoteEvent) => {
  const chainCandidates = [
    event.parentBlock?.chain,
    ...(event.auxBlocks?.map((block) => block.chain) ?? [])
  ];
  for (const chain of chainCandidates) {
    const resolved = getChainName(chain) ?? chain;
    if (resolved) return resolved;
  }
  return undefined;
};

const LiveSharenotes = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const maxLiveBlocks = isMobile ? MAX_LIVE_BLOCKS_MOBILE : MAX_LIVE_BLOCKS_DESKTOP;
  const liveSharenotes = useSelector(getLiveSharenotes);
  const isLoading = useSelector(getIsLiveSharenotesLoading);
  const shares = useSelector(getShares);

  const sortedSharenotes = useMemo(
    () => [...liveSharenotes].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [liveSharenotes]
  );

  const activePrimaryChain = useMemo(() => {
    for (const event of sortedSharenotes) {
      const chain = resolveEventPrimaryChain(event);
      if (chain) return chain;
    }
    return undefined;
  }, [sortedSharenotes]);

  const visibleSharenotes = useMemo(() => {
    if (!activePrimaryChain) return sortedSharenotes;
    const normalizedPrimary = activePrimaryChain.toLowerCase();
    const filtered: ILiveSharenoteEvent[] = [];
    for (const event of sortedSharenotes) {
      const eventChain = resolveEventPrimaryChain(event)?.toLowerCase();
      if (eventChain && eventChain !== normalizedPrimary) {
        break;
      }
      filtered.push(event);
    }
    return filtered;
  }, [activePrimaryChain, sortedSharenotes]);

  const sharenotesWithValue = useMemo(
    () =>
      visibleSharenotes.filter((event) => {
        const note = toSharenote(event);
        return note && Number.isFinite(note.zBits) && note.zBits > 0;
      }),
    [visibleSharenotes]
  );

  const normalizedPrimaryChain = activePrimaryChain?.toLowerCase();
  const latestVisibleEvent = visibleSharenotes[0];
  const latestEventExplicitUnsolved = latestVisibleEvent?.solved === false;

  const lastLiveSharenoteTimestamp = useMemo(() => {
    for (const event of sharenotesWithValue) {
      const timestamp = event.timestamp;
      if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
        return timestamp;
      }
    }
    return undefined;
  }, [sharenotesWithValue]);

  const [lastEventAge, setLastEventAge] = useState(() =>
    formatLastEventAge(lastLiveSharenoteTimestamp)
  );

  useEffect(() => {
    setLastEventAge(formatLastEventAge(lastLiveSharenoteTimestamp));
    if (
      typeof lastLiveSharenoteTimestamp !== 'number' ||
      !Number.isFinite(lastLiveSharenoteTimestamp)
    ) {
      return undefined;
    }

    const interval = setInterval(() => {
      setLastEventAge(formatLastEventAge(lastLiveSharenoteTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastLiveSharenoteTimestamp]);

  const shareCount = sharenotesWithValue.length;

  const liveChartData = useMemo<LiveChartData>(() => {
    const baseBlockMap = new Map<number, Map<string, Sharenote>>();
    const blockEventCounts = new Map<number, number>();
    const blockWorkerCounts = new Map<number, Map<string, number>>();
    const solvedBlockTotals = new Map<number, Sharenote>();

    sharenotesWithValue.forEach((event) => {
      if (typeof event.blockHeight !== 'number' || !Number.isFinite(event.blockHeight)) return;
      const workerId = normalizeWorkerId(event.worker ?? event.workerId);
      const deltaNote = toSharenote(event);
      if (!deltaNote) return;
      if (!Number.isFinite(deltaNote.zBits) || deltaNote.zBits === 0) return;

      blockEventCounts.set(event.blockHeight, (blockEventCounts.get(event.blockHeight) ?? 0) + 1);

      const workerCounts = blockWorkerCounts.get(event.blockHeight) ?? new Map<string, number>();
      workerCounts.set(workerId, (workerCounts.get(workerId) ?? 0) + 1);
      blockWorkerCounts.set(event.blockHeight, workerCounts);

      const workerSum = baseBlockMap.get(event.blockHeight) ?? new Map<string, Sharenote>();
      const existing = workerSum.get(workerId);
      const combined = existing ? combineNotesSerial([existing, deltaNote]) : deltaNote;
      workerSum.set(workerId, combined);
      baseBlockMap.set(event.blockHeight, workerSum);
    });

    const blockHeights = Array.from(
      new Set<number>([...baseBlockMap.keys(), ...solvedBlockTotals.keys()])
    ).sort((a, b) => a - b);
    const trackedBlockHeights = blockHeights.slice(-maxLiveBlocks);

    if (!trackedBlockHeights.length) {
      return {
        blockHeights: [],
        blockLabels: [],
        series: [] as LiveBarSeries[],
        blockEventCounts: {},
        blockSeriesCounts: {},
        workerTotals: []
      };
    }

    const workerIds = Array.from(
      Array.from(baseBlockMap.values()).reduce<Set<string>>((acc, map) => {
        map.forEach((_value, worker) => acc.add(worker));
        return acc;
      }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b));
    ensureWorkerColors(theme, workerIds);

    const blockLabels = trackedBlockHeights.map((height) => `#${height}`);

    const baseSeries: LiveBarSeries[] = workerIds
      .map((workerId) => ({
        id: workerId,
        label: workerId === 'unknown' ? t('worker') : workerId,
        data: trackedBlockHeights.map((height) =>
          toLinearValue(baseBlockMap.get(height)?.get(workerId))
        ),
        color: getWorkerColor(theme, workerId),
        stack: 'liveSharenotes'
      }))
      .filter((series) => series.data.some((value) => value > 0));

    const workerTotals = workerIds
      .map((workerId) => {
        const total = trackedBlockHeights.reduce((acc, height) => {
          const note = baseBlockMap.get(height)?.get(workerId);
          return acc + toLinearValue(note);
        }, 0);
        return { workerId, total, color: getWorkerColor(theme, workerId) };
      })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);

    const blockEventCountRecords = trackedBlockHeights.reduce<Record<string, number>>(
      (acc, height) => {
        acc[`#${height}`] = blockEventCounts.get(height) ?? 0;
        return acc;
      },
      {}
    );

    const blockSeriesCountRecords = trackedBlockHeights.reduce<
      Record<string, Record<string, number>>
    >((acc, height) => {
      const counts = blockWorkerCounts.get(height);
      if (!counts) return acc;
      acc[`#${height}`] = Array.from(counts.entries()).reduce<Record<string, number>>(
        (workerAcc, [id, count]) => {
          workerAcc[id] = count;
          return workerAcc;
        },
        {}
      );
      return acc;
    }, {});

    return {
      blockHeights: trackedBlockHeights,
      blockLabels,
      series: baseSeries,
      blockEventCounts: blockEventCountRecords,
      blockSeriesCounts: blockSeriesCountRecords,
      workerTotals
    };
  }, [maxLiveBlocks, sharenotesWithValue, t, theme]);

  const parentChainBlock = useMemo<IAuxiliaryBlock | undefined>(() => {
    let latestParent:
      | {
          block: IAuxiliaryBlock;
          timestamp: number;
        }
      | undefined;

    visibleSharenotes.forEach((event) => {
      if (!event.parentBlock) return;
      const resolvedChain =
        getChainName(event.parentBlock.chain) ??
        event.parentBlock.chain ??
        activePrimaryChain ??
        'unknown';
      const normalizedBlock: IAuxiliaryBlock = {
        ...event.parentBlock,
        chain: resolvedChain
      };
      const ts = event.timestamp ?? 0;
      if (!latestParent || ts > latestParent.timestamp) {
        latestParent = { block: normalizedBlock, timestamp: ts };
      }
    });

    return latestParent?.block;
  }, [activePrimaryChain, visibleSharenotes]);

  const auxChainHighlights = useMemo<IAuxiliaryBlock[]>(() => {
    const latestAuxBlocks = latestVisibleEvent?.auxBlocks ?? [];
    if (!latestAuxBlocks.length) return [];

    return latestAuxBlocks
      .map((block, index) => {
        const resolvedChainName =
          getChainName(block.chain) ?? block.chain ?? activePrimaryChain ?? 'unknown';
        return { block: { ...block, chain: resolvedChainName }, order: index };
      })
      .sort((a, b) => {
        const aPrimary = (a.block.chain ?? '').toLowerCase() === normalizedPrimaryChain;
        const bPrimary = (b.block.chain ?? '').toLowerCase() === normalizedPrimaryChain;
        if (aPrimary && !bPrimary) return -1;
        if (!aPrimary && bPrimary) return 1;
        const aLabel = a.block.chain ?? '';
        const bLabel = b.block.chain ?? '';
        const labelComparison = aLabel.localeCompare(bLabel);
        if (labelComparison !== 0) return labelComparison;
        return a.order - b.order;
      })
      .map(({ block }) => block);
  }, [activePrimaryChain, latestVisibleEvent, normalizedPrimaryChain]);

  const hasVisibleEvents = shareCount > 0;

  const isLiveSharenoteStale =
    lastLiveSharenoteTimestamp !== undefined &&
    Date.now() - lastLiveSharenoteTimestamp * 1000 > LIVE_SHARENOTE_STALE_THRESHOLD_MS;
  const shouldShowEmptyState = !hasVisibleEvents || isLiveSharenoteStale;

  const formatChartValue = (value?: number | null) => formatLinearValueAsSharenoteLabel(value);
  const formatTotalSharenote = formatLinearValueAsSharenoteLabel;
  const formatEventCountText = (count: number) => t('liveSharenotes.count', { count });
  const formatChainDisplayName = (chain?: string) => {
    const resolvedChain = getChainName(chain) ?? chain;
    if (!resolvedChain) return t('liveSharenotes.unknownChain');
    return resolvedChain.charAt(0).toUpperCase() + resolvedChain.slice(1);
  };
  const formatAuxChainHeight = (height?: number) =>
    typeof height === 'number' && Number.isFinite(height) ? `#${height}` : '--';
  const auxChainBaseBackground = `linear-gradient(135deg, ${alpha(
    theme.palette.background.paper,
    0.92
  )}, ${alpha(theme.palette.background.default, 0.82)})`;
  const parentChainBackground = `linear-gradient(135deg, ${alpha(
    theme.palette.primary.main,
    0.2
  )}, ${alpha(theme.palette.primary.light, 0.18)}, ${alpha(theme.palette.primary.dark, 0.16)})`;
  const parentChainBorderColor = alpha(theme.palette.primary.main, 0.28);
  const solvedAuxChainBackground = `linear-gradient(135deg, ${alpha(
    theme.palette.success.light,
    0.3
  )}, ${alpha(theme.palette.success.main, 0.18)}, ${alpha(theme.palette.background.default, 0.9)})`;
  const solvedHighlightColor = alpha(theme.palette.success.main, 0.38);
  const solvedHighlightPulseKeyframes = {
    '@keyframes liveAuxSolvedPulse': {
      '0%': { boxShadow: `0 0 0 0 ${solvedHighlightColor}` },
      '100%': { boxShadow: `0 0 0 10px ${alpha(theme.palette.success.main, 0)}` }
    }
  };
  const solvedHighlightGlowKeyframes = {
    '@keyframes liveAuxSolvedGlow': {
      '0%': { backgroundColor: alpha(theme.palette.success.main, 0.1) },
      '100%': { backgroundColor: alpha(theme.palette.success.main, 0.16) }
    }
  };
  const blockUpdateHighlightKeyframes = {
    '@keyframes liveBlockUpdateHighlight': {
      '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.info.main, 0.22)}` },
      '100%': { boxShadow: `0 0 0 10px ${alpha(theme.palette.info.main, 0)}` }
    }
  };
  const blockNumberSolvedFlashKeyframes = {
    '@keyframes liveBlockNumberSolved': {
      '0%': {
        color: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.14)
      },
      '100%': {
        color: 'inherit',
        backgroundColor: 'transparent'
      }
    }
  };
  const blockNumberUpdateFlashKeyframes = {
    '@keyframes liveBlockNumberUpdate': {
      '0%': {
        color: theme.palette.text.primary,
        backgroundColor: alpha(theme.palette.primary.main, 0.08)
      },
      '100%': {
        color: 'inherit',
        backgroundColor: 'transparent'
      }
    }
  };
  const newSharenoteHitKeyframes = {
    '@keyframes liveSharenoteHit': {
      '0%': { transform: 'translateY(-8px)' },
      '18%': { transform: 'translateY(-16px)' },
      '36%': { transform: 'translateY(-4px)' },
      '62%': { transform: 'translateY(-11px)' },
      '100%': { transform: 'translateY(0)' }
    }
  };
  const newSharenoteGlowKeyframes = {
    '@keyframes liveSharenoteGlow': {
      '0%': { filter: 'brightness(100%)' },
      '18%': { filter: 'brightness(118%)' },
      '55%': { filter: 'brightness(110%)' },
      '100%': { filter: 'brightness(100%)' }
    }
  };

  const previousBlockStateRef = useRef<Record<string, number | undefined>>({});
  const hasInitializedBlocksRef = useRef(false);
  const [recentlyUpdatedChains, setRecentlyUpdatedChains] = useState<Record<string, number>>({});
  const previousBlockEventCountsRef = useRef<Record<number, number>>({});
  const [recentBlockHighlights, setRecentBlockHighlights] = useState<Record<number, number>>({});
  const hasInitializedBlockEventsRef = useRef(false);

  useEffect(() => {
    const nextState: Record<string, number | undefined> = {};
    const updates: Record<string, number> = {};

    const trackBlock = (block?: IAuxiliaryBlock, fallbackChain?: string) => {
      if (!block) return;
      const chainName = getChainName(block.chain) ?? block.chain ?? fallbackChain ?? 'unknown';
      const chainKey = chainName.toLowerCase();
      const prevHeight = previousBlockStateRef.current[chainKey];
      if (
        hasInitializedBlocksRef.current &&
        block.height !== undefined &&
        block.height !== prevHeight
      ) {
        updates[chainKey] = Date.now();
      }
      nextState[chainKey] = block.height;
    };

    trackBlock(parentChainBlock, activePrimaryChain);
    auxChainHighlights.forEach((block) => trackBlock(block, activePrimaryChain));

    previousBlockStateRef.current = nextState;
    if (!hasInitializedBlocksRef.current) {
      hasInitializedBlocksRef.current = true;
      return;
    }

    if (Object.keys(updates).length > 0) {
      setRecentlyUpdatedChains((prev) => ({ ...prev, ...updates }));
    }
  }, [activePrimaryChain, auxChainHighlights, parentChainBlock]);

  useEffect(() => {
    if (Object.keys(recentlyUpdatedChains).length === 0) return;
    const timeout = setTimeout(() => setRecentlyUpdatedChains({}), 1600);
    return () => clearTimeout(timeout);
  }, [recentlyUpdatedChains]);

  useEffect(() => {
    if (!liveChartData.blockHeights.length) return;
    const prevCounts = previousBlockEventCountsRef.current;
    const nextCounts: Record<number, number> = {};
    const updates: Record<number, number> = {};
    const now = Date.now();

    liveChartData.blockHeights.forEach((height) => {
      const count = liveChartData.blockEventCounts[`#${height}`] ?? 0;
      nextCounts[height] = count;
      const prevCount = prevCounts[height];
      const baseline = hasInitializedBlockEventsRef.current ? prevCount ?? 0 : prevCount;
      if (baseline !== undefined && count > baseline) {
        updates[height] = now;
      }
    });

    hasInitializedBlockEventsRef.current = true;
    previousBlockEventCountsRef.current = nextCounts;
    if (Object.keys(updates).length) {
      setRecentBlockHighlights((prev) => ({ ...prev, ...updates }));
    }
  }, [liveChartData.blockEventCounts, liveChartData.blockHeights]);

  useEffect(() => {
    if (!Object.keys(recentBlockHighlights).length) return;
    const timeouts = Object.entries(recentBlockHighlights).map(([height, timestamp]) =>
      setTimeout(() => {
        setRecentBlockHighlights((prev) => {
          if (prev[Number(height)] !== timestamp) return prev;
          const { [Number(height)]: _removed, ...rest } = prev;
          return rest;
        });
      }, NEW_SHARENOTE_HIGHLIGHT_MS)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [recentBlockHighlights]);

  const highlightedBlockIndexes = useMemo(() => {
    const highlighted = new Set<number>();
    liveChartData.blockHeights.forEach((height, index) => {
      if (recentBlockHighlights[height] !== undefined) {
        highlighted.add(index);
      }
    });
    return highlighted;
  }, [liveChartData.blockHeights, recentBlockHighlights]);

  const solvedBlockHeights = useMemo(() => {
    const solved = new Set<number>();
    shares.forEach((share) => {
      const height = Number((share as any)?.blockHeight);
      if (Number.isFinite(height)) {
        solved.add(height);
      }
    });
    visibleSharenotes.forEach((event) => {
      if (event.solved !== true && event.parentBlock?.solved !== true) return;
      const height = event.blockHeight ?? event.parentBlock?.height;
      if (typeof height === 'number' && Number.isFinite(height)) {
        solved.add(height);
      }
    });
    return solved;
  }, [shares, visibleSharenotes]);

  const solvedBlockIndexes = useMemo(() => {
    const solved = new Set<number>();
    liveChartData.blockHeights.forEach((height, index) => {
      if (solvedBlockHeights.has(height)) {
        solved.add(index);
      }
    });
    return solved;
  }, [liveChartData.blockHeights, solvedBlockHeights]);

  const chartSeries = useMemo<LiveBarSeries[]>(
    () =>
      liveChartData.series
        .filter((series) =>
          series.data.some(
            (value) => typeof value === 'number' && value > 0
          )
        )
        .map((series) => ({
          ...series,
          valueFormatter: formatChartValue
        })),
    [liveChartData.series, formatChartValue]
  );
  const topSeriesByIndex = useMemo(() => {
    const topMap = new Map<number, string | number>();
    chartSeries.forEach((series) => {
      const seriesId = series.id;
      series.data.forEach((value, idx) => {
        if (typeof value === 'number' && value > 0) {
          topMap.set(idx, seriesId);
        }
      });
    });
    return topMap;
  }, [chartSeries]);
  const inlineLegendSlotProps = {
    direction: 'horizontal' as const,
    position: { vertical: 'top' as const, horizontal: 'start' as const },
    padding: { top: 4, bottom: 4 },
    itemGap: 10,
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

  const auxChainScrollRef = useRef<HTMLDivElement | null>(null);
  const auxChainDragState = useRef({ startX: 0, scrollLeft: 0 });
  const [shouldCenterAuxChains, setShouldCenterAuxChains] = useState(false);
  const [isDraggingAuxChains, setIsDraggingAuxChains] = useState(false);

  const SolvedBar = useCallback(
    (barProps: {
      id?: string | number;
      dataIndex: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      layout?: 'vertical' | 'horizontal';
      color?: string;
      ownerState?: { isHighlighted?: boolean; isFaded?: boolean };
    }) => {
      const isStackTop = topSeriesByIndex.get(barProps.dataIndex) === barProps.id;
      const {
        dataIndex,
        x = 0,
        y = 0,
        width = 0,
        height = 0,
        layout = 'vertical',
        color = theme.palette.primary.main,
        ownerState
      } = barProps;
      const yTop = Math.min(y, y + height);
      const isSolved = solvedBlockIndexes.has(dataIndex) && isStackTop;
      const isIncoming = highlightedBlockIndexes.has(dataIndex);
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const starSize = Math.max(8, Math.min(14, width * 0.75));
      const starGap = 6;
      const starTranslateY =
        layout === 'horizontal' ? y + height / 2 : yTop - starGap - starSize / 2;
      const starScale = starSize / 24;
      const barOpacity = ownerState?.isFaded ? 0.3 : 1;
      const pickaxeFill = '#f3c743';
      const pickaxeStroke = alpha(theme.palette.primary.main, 0.95);
      const highlightFilter =
        ownerState?.isHighlighted || isIncoming ? 'brightness(115%)' : undefined;
      const highlightStroke = 'none';
      const highlightAnimation = isIncoming
        ? 'liveSharenoteHit 0.36s cubic-bezier(0.25, 0.9, 0.3, 1), liveSharenoteGlow 1.2s ease-out 0.08s'
        : undefined;
      const pickaxeScale = starScale * 0.034; // scale original SVG bounds (~700) down to bar size
      const barShadow = `drop-shadow(0 6px 14px ${alpha(theme.palette.common.black, 0.18)})`;
      const highlightShadow = isIncoming
        ? `drop-shadow(0 10px 16px ${alpha(theme.palette.common.black, 0.3)})`
        : undefined;
      const filterParts = [barShadow];
      if (highlightShadow) filterParts.unshift(highlightShadow);
      if (highlightFilter) filterParts.unshift(highlightFilter);
      const composedFilter = filterParts.join(' ');

      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            stroke={highlightStroke}
            strokeWidth={0}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{
              opacity: barOpacity,
              filter: composedFilter,
              animation: highlightAnimation,
              transformOrigin: `${centerX}px ${centerY}px`
            }}
          />
          {isIncoming && null}
          {isSolved && (
            <g
              transform={`translate(${centerX - 12 * starScale}, ${
                starTranslateY - 12 * starScale
              }) scale(${pickaxeScale})`}
              style={{
                pointerEvents: 'none',
                filter: `drop-shadow(0 3px 10px ${alpha(theme.palette.success.dark, 0.4)})`
              }}>
              <path
                d="M 62.910305,586.86333 L 125.86516,650.60806 L 354.66003,422.80608 L 582.79529,652.32059 L 649.12836,585.39956 L 419.06211,356.15214 L 538.31924,239.08217 L 656.12237,360.43632 L 672.92355,183.72974 L 632.91916,143.04888 L 643.3629,132.19791 L 578.91235,67.944477 L 566.45233,81.085597 L 489.93282,4.363831 L 390.62711,103.14697 L 467.4617,180.34954 L 355.60522,292.86066 L 249.67092,189.78284 L 335.40773,104.38653 L 238.02361,7.697965 L 153.1742,92.253519 L 144.09633,82.235117 L 78.425241,147.87971 L 87.464971,157.23449 L 4.1797765,239.7581 L 102.32623,337.47278 L 186.38467,253.2337 L 289.76593,358.64588 L 62.910305,586.86333 z"
                fill={pickaxeFill}
                stroke={pickaxeStroke}
                strokeWidth={20}
                strokeLinejoin="round"
              />
            </g>
          )}
        </g>
      );
    },
    [highlightedBlockIndexes, solvedBlockIndexes, theme, topSeriesByIndex]
  );

  const updateAuxChainLayout = useCallback(() => {
    const target = auxChainScrollRef.current;
    if (!target) return;
    const canFitWithoutScroll = target.scrollWidth <= target.clientWidth + 1;
    setShouldCenterAuxChains(canFitWithoutScroll);
    if (canFitWithoutScroll) {
      target.scrollLeft = 0;
    }
  }, []);

  useEffect(() => {
    const handleResize = () => updateAuxChainLayout();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateAuxChainLayout]);

  useEffect(() => {
    const raf = requestAnimationFrame(updateAuxChainLayout);
    return () => cancelAnimationFrame(raf);
  }, [auxChainHighlights, parentChainBlock, updateAuxChainLayout]);

  const handleAuxChainPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (shouldCenterAuxChains) return;
      const target = auxChainScrollRef.current;
      if (!target) return;
      setIsDraggingAuxChains(true);
      auxChainDragState.current = { startX: event.clientX, scrollLeft: target.scrollLeft };
      target.setPointerCapture?.(event.pointerId);
    },
    [shouldCenterAuxChains]
  );

  const handleAuxChainPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDraggingAuxChains) return;
      const target = auxChainScrollRef.current;
      if (!target) return;
      event.preventDefault();
      const deltaX = event.clientX - auxChainDragState.current.startX;
      target.scrollLeft = auxChainDragState.current.scrollLeft - deltaX;
    },
    [isDraggingAuxChains]
  );

  const handleAuxChainPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDraggingAuxChains) return;
      const target = auxChainScrollRef.current;
      if (target?.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      setIsDraggingAuxChains(false);
    },
    [isDraggingAuxChains]
  );

  const tooltipTrigger = 'axis';
  const tooltipAnchor = 'pointer';

  return (
    <StyledCard
      sx={{
        height: { xs: 'auto', lg: 420 },
        maxHeight: '565px',
        ...newSharenoteHitKeyframes,
        ...newSharenoteGlowKeyframes
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
          {lastEventAge && !shouldShowEmptyState && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', lineHeight: 1 }}>
              {`${t('liveSharenotes.lastEventLabel', { defaultValue: 'Last event' })} ${lastEventAge}`}
            </Typography>
          )}
        </SectionHeader>
        <Box
          sx={{
            flexGrow: 1,
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
            ) : shouldShowEmptyState ? (
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
                {t('liveSharenotes.empty')}
              </Box>
            ) : (
              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    justifyContent: shouldCenterAuxChains ? 'center' : 'flex-start',
                    gap: { xs: 0.85, md: 1.1 },
                    minHeight: 32,
                    overflowX: 'auto',
                    padding: { xs: '0 4px 12px 4px', md: '10px 10px 20px 10px' },
                    scrollbarWidth: 'none',
                    cursor: shouldCenterAuxChains
                      ? 'default'
                      : isDraggingAuxChains
                      ? 'grabbing'
                      : 'grab',
                    userSelect: 'none',
                    touchAction: 'pan-y',
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    }
                  }}
                  ref={auxChainScrollRef}
                  onPointerDown={handleAuxChainPointerDown}
                  onPointerMove={handleAuxChainPointerMove}
                  onPointerUp={handleAuxChainPointerUp}
                  onPointerCancel={handleAuxChainPointerUp}
                  onPointerLeave={handleAuxChainPointerUp}>
                  {parentChainBlock &&
                    (() => {
                      const chainName =
                        getChainName(parentChainBlock.chain) ??
                        parentChainBlock.chain ??
                        activePrimaryChain ??
                        'unknown';
                      const chainKey = chainName.toLowerCase();
                      const abbreviatedChain = chainName.slice(0, 3).toUpperCase();
                      const iconSrc = getChainIconPath(chainName);
                      const isParentSolved =
                        parentChainBlock.solved === true && !latestEventExplicitUnsolved;
                      const isRecentlyUpdated = recentlyUpdatedChains[chainKey] !== undefined;
                      const animations = [];
                      if (isRecentlyUpdated) {
                        animations.push('liveBlockUpdateHighlight 0.85s ease-out');
                      }
                      if (isParentSolved) {
                        animations.push('liveAuxSolvedPulse 1.1s ease-out');
                      }
                      const animationValue = animations.length ? animations.join(', ') : 'none';
                      const chainLabel = formatChainDisplayName(chainName);
                      const heightLabel = formatAuxChainHeight(parentChainBlock.height);
                      const blockTargetLabel = formatSharenoteLabel(
                        parentChainBlock.blockSharenote ?? parentChainBlock.blockSharenoteZBits
                      );
                      const blockTargetValue = blockTargetLabel
                        ? (parentChainBlock.blockSharenote ??
                          parentChainBlock.blockSharenoteZBits ??
                          blockTargetLabel)
                        : undefined;
                      return (
                        <Box
                          key={`${chainKey}-${parentChainBlock.height ?? 'na'}-${isParentSolved ? 'solved' : 'live'}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.7,
                            pr: { xs: 0.85, sm: 1.15 },
                            pl: { xs: 0.75, sm: 1.05 },
                            py: 0.45,
                            borderRadius: 999,
                            flex: { xs: '0 0 auto', md: '0 0 auto' },
                            background: isParentSolved ? undefined : parentChainBackground,
                            backgroundImage: isParentSolved ? solvedAuxChainBackground : undefined,
                            backgroundSize: isParentSolved ? '160% 160%' : undefined,
                            border: `1px solid ${isParentSolved ? solvedHighlightColor : parentChainBorderColor}`,
                            boxShadow: isParentSolved
                              ? `0 6px 14px ${alpha(theme.palette.success.dark, 0.18)}`
                              : `0 6px 14px ${alpha(theme.palette.primary.main, 0.16)}`,
                            animation: animationValue,
                            ...blockUpdateHighlightKeyframes,
                            ...(isParentSolved
                              ? {
                                  ...solvedHighlightPulseKeyframes,
                                  ...solvedHighlightGlowKeyframes
                                }
                              : {})
                          }}>
                          {iconSrc ? (
                            <Box
                              component="img"
                              src={iconSrc}
                              alt={`${chainName} logo`}
                              draggable={false}
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                boxShadow: `0 8px 20px ${alpha(
                                  isParentSolved
                                    ? theme.palette.success.dark
                                    : theme.palette.primary.dark,
                                  0.25
                                )}`
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '0.74rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                color: theme.palette.primary.contrastText
                              }}>
                              {abbreviatedChain}
                            </Box>
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 78,
                              gap: 0.2
                            }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: '0.88rem' }}>
                              {chainLabel}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.65,
                                flexWrap: 'nowrap',
                                flexDirection: 'row'
                              }}>
                              <Typography
                                key={`${chainKey}-height-${parentChainBlock.height ?? 'na'}`}
                                variant="caption"
                                sx={{
                                  fontSize: { xs: '0.58rem', lg: '0.7rem' },
                                  borderRadius: 8,
                                  px: 0.4,
                                  ...blockNumberSolvedFlashKeyframes,
                                  ...blockNumberUpdateFlashKeyframes,
                                  animation: isRecentlyUpdated
                                    ? isParentSolved
                                      ? 'liveBlockNumberSolved 0.9s ease-out'
                                      : 'liveBlockNumberUpdate 0.9s ease-out'
                                    : undefined
                                }}
                                color="text.secondary">
                                {heightLabel}
                              </Typography>
                              {blockTargetValue && (
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.35,
                                    px: 0.65,
                                    py: 0.22,
                                    borderRadius: 12,
                                    background: `linear-gradient(135deg, ${alpha(
                                      theme.palette.primary.light,
                                      0.22
                                    )}, ${alpha(theme.palette.background.paper, 0.08)})`,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                                    boxShadow: `0 6px 14px ${alpha(
                                      theme.palette.primary.dark,
                                      0.14
                                    )}`,
                                    fontSize: '0.68rem',
                                    lineHeight: 1.15,
                                    color: theme.palette.text.primary
                                  }}>
                                  <Box
                                    component="span"
                                    sx={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      backgroundColor: alpha(theme.palette.primary.main, 0.95),
                                      boxShadow: `0 0 0 5px ${alpha(
                                        theme.palette.primary.main,
                                        0.12
                                      )}`
                                    }}
                                  />
                                  <ShareNoteLabel value={blockTargetValue} placeholder="--" />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })()}
                  {auxChainHighlights.map((block, index) => {
                    const chainName =
                      getChainName(block.chain) ?? block.chain ?? activePrimaryChain ?? 'unknown';
                    const abbreviatedChain = chainName.slice(0, 3).toUpperCase();
                    const chainLabel = formatChainDisplayName(chainName);
                    const heightLabel = formatAuxChainHeight(block.height);
                    const blockTargetLabel = formatSharenoteLabel(
                      block.blockSharenote ?? block.blockSharenoteZBits
                    );
                    const blockTargetValue = blockTargetLabel
                      ? (block.blockSharenote ?? block.blockSharenoteZBits ?? blockTargetLabel)
                      : undefined;
                    const iconSrc = getChainIconPath(chainName);
                    const chainKey = chainName.toLowerCase();
                    const isSolved = block.solved === true && !latestEventExplicitUnsolved;
                    const isRecentlyUpdated = recentlyUpdatedChains[chainKey] !== undefined;
                    const animations = [];
                    if (isRecentlyUpdated) {
                      animations.push('liveBlockUpdateHighlight 0.85s ease-out');
                    }
                    if (isSolved) {
                      animations.push('liveAuxSolvedPulse 1.1s ease-out');
                    }
                    const animationValue = animations.length ? animations.join(', ') : 'none';
                    return (
                      <Box
                        key={`${chainKey}-${block.height ?? 'na'}-${isSolved ? 'solved' : 'live'}-${index}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.7,
                          pr: { xs: 0.85, sm: 1.15 },
                          pl: { xs: 0.75, sm: 1.05 },
                          py: 0.45,
                          borderRadius: 999,
                          flex: { xs: '0 0 auto', md: '0 0 auto' },
                          background: isSolved ? undefined : auxChainBaseBackground,
                          backgroundImage: isSolved ? solvedAuxChainBackground : undefined,
                          backgroundSize: isSolved ? '160% 160%' : undefined,
                          borderColor: isSolved
                            ? solvedHighlightColor
                            : alpha(theme.palette.divider, 0.7),
                          boxShadow: `0 6px 14px ${alpha(theme.palette.common.black, 0.08)}`,
                          ...blockUpdateHighlightKeyframes,
                          ...(isSolved
                            ? {
                                animation: animationValue,
                                ...solvedHighlightPulseKeyframes,
                                ...solvedHighlightGlowKeyframes
                              }
                            : {
                                animation: animationValue,
                                ...blockUpdateHighlightKeyframes
                              })
                        }}>
                        {iconSrc ? (
                          <Box
                            component="img"
                            src={iconSrc}
                            alt={`${chainLabel} logo`}
                            draggable={false}
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.35)}`
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              fontSize: '0.74rem',
                              bgcolor: alpha(theme.palette.text.primary, 0.12),
                              color: theme.palette.text.primary
                            }}>
                            {abbreviatedChain}
                          </Box>
                        )}
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 78,
                            gap: 0.2
                          }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: '0.88rem' }}>
                            {chainLabel}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.6,
                              flexWrap: 'nowrap',
                              flexDirection: 'row'
                            }}>
                            <Typography
                              variant="caption"
                              key={`${chainKey}-height-${block.height ?? 'na'}`}
                              sx={{
                                fontSize: { xs: '0.58rem', lg: '0.7rem' },
                                borderRadius: 8,
                                px: 0.4,
                                ...blockNumberSolvedFlashKeyframes,
                                ...blockNumberUpdateFlashKeyframes,
                                animation: isRecentlyUpdated
                                  ? isSolved
                                    ? 'liveBlockNumberSolved 0.9s ease-out'
                                    : 'liveBlockNumberUpdate 0.9s ease-out'
                                  : undefined
                              }}
                              color="text.secondary">
                              {heightLabel}
                            </Typography>
                            {blockTargetValue && (
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.35,
                                  px: 0.6,
                                  py: 0.2,
                                  borderRadius: 12,
                                  background: `linear-gradient(135deg, ${alpha(
                                    isSolved
                                      ? theme.palette.success.light
                                      : theme.palette.primary.light,
                                    0.24
                                  )}, ${alpha(theme.palette.background.paper, 0.08)})`,
                                  border: `1px solid ${alpha(
                                    isSolved
                                      ? theme.palette.success.main
                                      : theme.palette.primary.main,
                                    0.35
                                  )}`,
                                  boxShadow: `0 6px 14px ${alpha(
                                    isSolved
                                      ? theme.palette.success.dark
                                      : theme.palette.primary.dark,
                                    0.14
                                  )}`,
                                  fontSize: '0.66rem',
                                  lineHeight: 1.1,
                                  color: theme.palette.text.primary
                                }}>
                                <Box
                                  component="span"
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: alpha(
                                      isSolved
                                        ? theme.palette.success.main
                                        : theme.palette.primary.main,
                                      0.95
                                    ),
                                    boxShadow: `0 0 0 5px ${alpha(
                                      isSolved
                                        ? theme.palette.success.main
                                        : theme.palette.primary.main,
                                      0.12
                                    )}`
                                  }}
                                />
                                <ShareNoteLabel value={blockTargetValue} placeholder="--" />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    maxHeight: { xs: 300, lg: 'unset' },
                    height: { xs: 300, lg: 'unset' },
                    ...inlineLegendSx
                  }}>
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
                    margin={{ bottom: 0, left: 10, right: 10, top: 28 }}
                    slots={{ tooltip: StackedTotalTooltip as any, bar: SolvedBar as any }}
                    slotProps={{
                      legend: inlineLegendSlotProps,
                      tooltip: {
                        placement: isMobile ? 'top' : undefined,
                        valueFormatter: formatChartValue,
                        totalFormatter: formatTotalSharenote,
                        axisEventCounts: liveChartData.blockEventCounts,
                        axisSeriesCounts: liveChartData.blockSeriesCounts,
                        eventCountFormatter: formatEventCountText,
                        renderSeriesValue: ({
                          formattedValue,
                          count
                        }: {
                          formattedValue: string | number | null | undefined;
                          count?: number;
                        }) => (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 0.75
                            }}>
                            <ShareNoteLabel value={formattedValue} placeholder="--" />
                            {typeof count === 'number' && (
                              <Typography variant="caption" color="text.secondary">
                                x{count}
                              </Typography>
                            )}
                          </Box>
                        ),
                        renderTotalValue: ({
                          formattedTotal
                        }: {
                          formattedTotal: string | number;
                        }) => <ShareNoteLabel value={formattedTotal} placeholder="--" />
                      } as any
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </StyledCard>
  );
};

export default LiveSharenotes;
