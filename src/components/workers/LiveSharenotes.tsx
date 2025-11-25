import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainIconPath, getChainName } from '@constants/chainIcons';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  combineNotesSerial,
  noteFromZBits,
  parseNoteLabel,
  Sharenote
} from '@soprinter/sharenotejs';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IAuxiliaryBlock, ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { getIsLiveSharenotesLoading, getLiveSharenotes } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { getWorkerColor } from '@utils/colors';
import { formatSharenoteLabel } from '@utils/helpers';
import { formatRelativeFromTimestamp } from '@utils/time';

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

const MAX_LIVE_BLOCKS = 15;
const LIVE_SHARENOTE_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5m

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

type LiveChartData = {
  blockLabels: string[];
  series: Array<Record<string, any>>;
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
  const liveSharenotes = useSelector(getLiveSharenotes);
  const isLoading = useSelector(getIsLiveSharenotesLoading);

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

  const normalizedPrimaryChain = activePrimaryChain?.toLowerCase();

  const lastLiveSharenoteTimestamp = useMemo(() => {
    for (const event of visibleSharenotes) {
      const timestamp = event.timestamp;
      if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
        return timestamp;
      }
    }
    return undefined;
  }, [visibleSharenotes]);

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

  const shareCount = visibleSharenotes.length;

  const liveChartData = useMemo<LiveChartData>(() => {
    const baseBlockMap = new Map<number, Map<string, Sharenote>>();
    const blockEventCounts = new Map<number, number>();
    const blockWorkerCounts = new Map<number, Map<string, number>>();
    const solvedBlockTotals = new Map<number, Sharenote>();

    visibleSharenotes.forEach((event) => {
      if (typeof event.blockHeight !== 'number' || !Number.isFinite(event.blockHeight)) return;
      const workerId = event.worker ?? event.workerId ?? 'unknown';
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
    const trackedBlockHeights = blockHeights.slice(-MAX_LIVE_BLOCKS);

    if (!trackedBlockHeights.length) {
      return {
        blockLabels: [],
        series: [] as Array<Record<string, any>>,
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

    const blockLabels = trackedBlockHeights.map((height) => `#${height}`);

    const baseSeries = workerIds
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
      blockLabels,
      series: baseSeries,
      blockEventCounts: blockEventCountRecords,
      blockSeriesCounts: blockSeriesCountRecords,
      workerTotals
    };
  }, [visibleSharenotes, t, theme]);

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
    const chainMap = new Map<
      string,
      {
        block: IAuxiliaryBlock;
        timestamp: number;
      }
    >();

    visibleSharenotes.forEach((event) => {
      const ts = event.timestamp ?? 0;
      event.auxBlocks?.forEach((block) => {
        const resolvedChainName = getChainName(block.chain) ?? block.chain ?? 'unknown';
        const chainKey = resolvedChainName.toLowerCase();
        const normalizedBlock: IAuxiliaryBlock = { ...block, chain: resolvedChainName };
        const existing = chainMap.get(chainKey);
        if (!existing || ts > existing.timestamp) {
          chainMap.set(chainKey, { block: normalizedBlock, timestamp: ts });
        }
      });
    });

    return Array.from(chainMap.entries())
      .sort((a, b) => {
        const [, aValue] = a;
        const [, bValue] = b;
        const aPrimary = (aValue.block.chain ?? '').toLowerCase() === normalizedPrimaryChain;
        const bPrimary = (bValue.block.chain ?? '').toLowerCase() === normalizedPrimaryChain;
        if (aPrimary && !bPrimary) return -1;
        if (!aPrimary && bPrimary) return 1;
        const aLabel = aValue.block.chain ?? '';
        const bLabel = bValue.block.chain ?? '';
        return aLabel.localeCompare(bLabel);
      })
      .map(([, value]) => value.block);
  }, [normalizedPrimaryChain, visibleSharenotes]);

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

  const previousBlockStateRef = useRef<Record<string, number | undefined>>({});
  const hasInitializedBlocksRef = useRef(false);
  const [recentlyUpdatedChains, setRecentlyUpdatedChains] = useState<Record<string, number>>({});

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

  const chartSeries = liveChartData.series.map((series) => ({
    ...series,
    valueFormatter: formatChartValue
  }));

  return (
    <StyledCard
      sx={{
        maxHeight: '565px',
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
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    alignItems: 'center',
                    justifyContent: { md: 'center', xs: 'flex-start', lg: 'flex-start' },
                    gap: { xs: 0.85, md: 1.1 },
                    minHeight: 32,
                    overflowX: { xs: 'visible', md: 'auto' },
                    padding: { md: '10px 10px 20px 10px' },
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    }
                  }}>
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
                      const isParentSolved = parentChainBlock.solved === true;
                      const isRecentlyUpdated = recentlyUpdatedChains[chainKey] !== undefined;
                      const animations = [];
                      if (isRecentlyUpdated) {
                        animations.push('liveBlockUpdateHighlight 0.85s ease-out');
                      }
                      if (isParentSolved) {
                        animations.push('liveAuxSolvedPulse 1.1s ease-out');
                      }
                      const chainLabel = formatChainDisplayName(chainName);
                      const heightLabel = formatAuxChainHeight(parentChainBlock.height);
                      const blockTargetLabel = formatSharenoteLabel(
                        parentChainBlock.blockSharenote ?? parentChainBlock.blockSharenoteZBits
                      );
                      const blockTargetValue = blockTargetLabel
                        ? parentChainBlock.blockSharenote ??
                          parentChainBlock.blockSharenoteZBits ??
                          blockTargetLabel
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
                            flex: { xs: '1 1 48%', md: '0 0 auto' },
                            background: isParentSolved ? undefined : parentChainBackground,
                            backgroundImage: isParentSolved ? solvedAuxChainBackground : undefined,
                            backgroundSize: isParentSolved ? '160% 160%' : undefined,
                            border: `1px solid ${isParentSolved ? solvedHighlightColor : parentChainBorderColor}`,
                            boxShadow: isParentSolved
                              ? `0 6px 14px ${alpha(theme.palette.success.dark, 0.18)}`
                              : `0 6px 14px ${alpha(theme.palette.primary.main, 0.16)}`,
                            animation: animations.join(', ') || undefined,
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
                                gap: 0.75,
                                flexWrap: 'wrap'
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
                      ? block.blockSharenote ?? block.blockSharenoteZBits ?? blockTargetLabel
                      : undefined;
                    const iconSrc = getChainIconPath(chainName);
                    const chainKey = chainName.toLowerCase();
                    const isSolved = block.solved === true;
                    const isRecentlyUpdated = recentlyUpdatedChains[chainKey] !== undefined;
                    const animations = [];
                    if (isRecentlyUpdated) {
                      animations.push('liveBlockUpdateHighlight 0.85s ease-out');
                    }
                    if (isSolved) {
                      animations.push('liveAuxSolvedPulse 1.1s ease-out');
                    }
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
                          flex: { xs: '1 1 48%', md: '0 0 auto' },
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
                                animation: animations.join(', ') || undefined,
                                ...solvedHighlightPulseKeyframes,
                                ...solvedHighlightGlowKeyframes
                              }
                            : {
                                animation: animations.join(', ') || undefined,
                                ...blockUpdateHighlightKeyframes
                              })
                        }}>
                        {iconSrc ? (
                          <Box
                            component="img"
                            src={iconSrc}
                            alt={`${chainLabel} logo`}
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
                              gap: 0.65,
                              flexWrap: 'wrap'
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
                                    isSolved ? theme.palette.success.light : theme.palette.primary.light,
                                    0.24
                                  )}, ${alpha(theme.palette.background.paper, 0.08)})`,
                                  border: `1px solid ${alpha(
                                    isSolved ? theme.palette.success.main : theme.palette.primary.main,
                                    0.35
                                  )}`,
                                  boxShadow: `0 6px 14px ${alpha(
                                    isSolved ? theme.palette.success.dark : theme.palette.primary.dark,
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
                                      isSolved ? theme.palette.success.main : theme.palette.primary.main,
                                      0.95
                                    ),
                                    boxShadow: `0 0 0 5px ${alpha(
                                      isSolved ? theme.palette.success.main : theme.palette.primary.main,
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
                    height: { xs: 300, lg: 'unset' }
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
                    margin={{ bottom: 0, left: 10, right: 10, top: 16 }}
                    slots={{ tooltip: StackedTotalTooltip as any }}
                    slotProps={{
                      tooltip: {
                        trigger: 'axis',
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
