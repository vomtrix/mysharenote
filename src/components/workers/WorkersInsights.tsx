import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BoltIcon from '@mui/icons-material/Bolt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { lighten, alpha as muiAlpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ReliabilityId, requiredHashrate } from '@soprinter/sharenotejs';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import WorkerCircuitIcon from '@components/icons/WorkerCircuitIcon';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import { getHashrates, getIsHashratesLoading } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { getWorkerColor } from '@utils/colors';
import { beautifyWorkerUserAgent, formatHashrate } from '@utils/helpers';
import { formatRelativeTime, toDateFromMaybeSeconds } from '@utils/time';

const HASHRATE_BASE_INTERVAL_MS = 5000;
const HASHRATE_REEVALUATE_INTERVAL_MS = HASHRATE_BASE_INTERVAL_MS * 2;
const WORKER_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5m

const parseMeanTime = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatMeanTime = (secondsValue: number | string | undefined) => {
  const seconds = parseMeanTime(secondsValue);
  if (seconds === undefined || seconds < 0) return '--';
  if (seconds < 60) {
    const formattedSeconds = seconds.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${formattedSeconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const WorkersInsights = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const hashrates = useSelector(getHashrates) as IHashrateEvent[];
  const isHashrateLoading = useSelector(getIsHashratesLoading);
  const [reevaluateTick, setReevaluateTick] = useState(0);
  const [refreshEta, setRefreshEta] = useState<number | null>(null);
  const [refreshProgress, setRefreshProgress] = useState(0);

  useEffect(() => {
    if (!hashrates?.length) return;
    const timer = setTimeout(() => {
      setReevaluateTick((prev) => prev + 1);
    }, HASHRATE_REEVALUATE_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [hashrates, reevaluateTick]);

  useEffect(() => {
    if (!hashrates || hashrates.length === 0) {
      setRefreshEta(null);
      setRefreshProgress(0);
      return;
    }

    const now = Date.now();
    setRefreshEta(now + HASHRATE_BASE_INTERVAL_MS);
    setRefreshProgress(0);
  }, [hashrates]);

  useEffect(() => {
    if (refreshEta === null) return;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = refreshEta - now;
      if (remaining <= 0) {
        setRefreshProgress(1);
        return;
      }

      const clampedRemaining = Math.max(0, Math.min(HASHRATE_BASE_INTERVAL_MS, remaining));
      const progress = 1 - clampedRemaining / HASHRATE_BASE_INTERVAL_MS;
      setRefreshProgress(progress);
    };

    const timer = setInterval(updateProgress, 120);
    updateProgress();
    return () => clearInterval(timer);
  }, [refreshEta]);

  const latestHashrateEvent = useMemo(() => {
    if (!hashrates?.length) return undefined;
    return hashrates.reduce<IHashrateEvent | undefined>((latest, event) => {
      if (!event) return latest;
      if (!latest) return event;
      const latestTimestamp =
        typeof latest.timestamp === 'number' && Number.isFinite(latest.timestamp)
          ? latest.timestamp
          : -Infinity;
      const eventTimestamp =
        typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)
          ? event.timestamp
          : -Infinity;
      return eventTimestamp >= latestTimestamp ? event : latest;
    }, undefined);
  }, [hashrates]);

  const workers = useMemo(() => {
    if (!latestHashrateEvent?.workerDetails) return [];

    const now = Date.now();

    const mapped = Object.entries(latestHashrateEvent.workerDetails)
      .map(([worker, detail]) => {
        if (!worker) return null;

        const meanTimeNumeric = parseMeanTime(detail?.meanTime);
        const sharenoteRaw = detail?.sharenote;
        const meanSharenoteRaw = detail?.meanSharenote;
        const lastShareDate = toDateFromMaybeSeconds(detail?.lastShareTimestamp);
        const hasSharenoteValue =
          sharenoteRaw !== undefined && sharenoteRaw !== null && sharenoteRaw !== '';
        const hasMeanSharenoteValue =
          meanSharenoteRaw !== undefined && meanSharenoteRaw !== null && meanSharenoteRaw !== '';
        const hasAnyShareValue = hasSharenoteValue || hasMeanSharenoteValue;

        if (!hasAnyShareValue) {
          return null;
        }

        if (lastShareDate && now - lastShareDate.getTime() > WORKER_STALE_THRESHOLD_MS) {
          return null;
        }

        const sharenoteDisplayRaw =
          hasSharenoteValue && typeof sharenoteRaw === 'number'
            ? sharenoteRaw.toLocaleString()
            : hasSharenoteValue
              ? (() => {
                  const numeric = Number(sharenoteRaw);
                  return Number.isNaN(numeric) ? String(sharenoteRaw) : numeric.toLocaleString();
                })()
              : undefined;

        const meanSharenoteDisplayRaw =
          meanSharenoteRaw === undefined || meanSharenoteRaw === null || meanSharenoteRaw === ''
            ? undefined
            : typeof meanSharenoteRaw === 'number'
              ? meanSharenoteRaw.toLocaleString()
              : (() => {
                  const rawValue =
                    typeof meanSharenoteRaw === 'string'
                      ? meanSharenoteRaw.trim()
                      : String(meanSharenoteRaw);
                  if (rawValue === '') return undefined;
                  const numeric = Number(rawValue);
                  return Number.isNaN(numeric) ? rawValue : numeric.toLocaleString();
                })();
        const primarySharenoteDisplay = sharenoteDisplayRaw ?? meanSharenoteDisplayRaw;
        const meanSharenoteBadge =
          sharenoteDisplayRaw &&
          meanSharenoteDisplayRaw &&
          meanSharenoteDisplayRaw !== sharenoteDisplayRaw
            ? meanSharenoteDisplayRaw
            : undefined;

        const sharenoteLabelForCalc = hasSharenoteValue
          ? String(
              typeof sharenoteRaw === 'string' ? sharenoteRaw.trim() : (sharenoteRaw ?? '')
            ).toUpperCase()
          : undefined;

        const detailHashrate =
          typeof detail?.hashrate === 'number' && Number.isFinite(detail.hashrate)
            ? detail.hashrate
            : undefined;
        const fallbackHashrate =
          typeof latestHashrateEvent.workers?.[worker] === 'number' &&
          Number.isFinite(latestHashrateEvent.workers?.[worker] ?? NaN)
            ? (latestHashrateEvent.workers?.[worker] as number)
            : undefined;

        const actualHashrate = detailHashrate ?? fallbackHashrate;
        let derivedHashrate: number | undefined;
        if (sharenoteLabelForCalc && sharenoteLabelForCalc.length > 0) {
          try {
            const computedMeasurement = requiredHashrate(
              sharenoteLabelForCalc,
              HASHRATE_BASE_INTERVAL_MS / 1000,
              {
                reliability: ReliabilityId.Mean
              }
            );
            const computed = computedMeasurement.floatValue();
            derivedHashrate = Number.isFinite(computed) && computed > 0 ? computed : undefined;
          } catch {
            derivedHashrate = undefined;
          }
        }

        const hashrateFromNoteDisplay =
          derivedHashrate !== undefined ? formatHashrate(derivedHashrate) : undefined;

        return {
          worker,
          sharenote: primarySharenoteDisplay,
          meanSharenote: meanSharenoteBadge,
          meanTime: meanTimeNumeric,
          hashrate: actualHashrate,
          hashrateFromNote: derivedHashrate,
          hashrateFromNoteDisplay,
          lastShareTimestamp: detail?.lastShareTimestamp,
          timestamp: latestHashrateEvent.timestamp,
          userAgent:
            typeof detail?.userAgent === 'string' && detail.userAgent.trim().length > 0
              ? detail.userAgent
              : undefined
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const withShare = mapped.map((entry) => {
      const baselineHashrate = entry.hashrate;
      const rawShare =
        entry.hashrateFromNote !== undefined &&
        baselineHashrate !== undefined &&
        baselineHashrate > 0
          ? (baselineHashrate / entry.hashrateFromNote) * 100
          : undefined;
      const share =
        rawShare !== undefined && Number.isFinite(rawShare)
          ? Math.max(0, Number(rawShare))
          : undefined;
      return {
        ...entry,
        hashratePercent: share
      };
    });

    return withShare.sort((a, b) => {
      const rateA = a.hashrate ?? 0;
      const rateB = b.hashrate ?? 0;
      if (rateA === rateB) return a.worker.localeCompare(b.worker);
      return rateB - rateA;
    });
  }, [latestHashrateEvent, reevaluateTick]);

  const workerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    workers.forEach((entry) => {
      map[entry.worker] = getWorkerColor(theme, entry.worker);
    });
    return map;
  }, [workers, theme]);

  const hasData = workers.length > 0;
  const showScrollHint = workers.length > 2;
  const listMaxHeight = showScrollHint ? 'calc(100% - 56px)' : 'none';
  const shellBorder = muiAlpha(
    theme.palette.primary.main,
    theme.palette.mode === 'dark' ? 0.18 : 0.25
  );
  const refreshProgressPercent = Math.min(100, Math.max(0, refreshProgress * 100));
  const refreshProgressRadians = (refreshProgressPercent / 100) * Math.PI * 2;
  const remainingRadians = Math.PI * 2 - refreshProgressRadians;
  const showRefreshIndicator = hasData && !isHashrateLoading;

  return (
    <StyledCard
      sx={{
        border: `1px solid ${shellBorder}`,
        boxShadow: '0 15px 45px -35px rgba(40, 40, 125, 0.45)',
        height: { xs: 'auto', lg: 320 },
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
            gap: 1
          }}>
          <InfoHeader title={t('workersInsights')} tooltip={t('info.workersInsights')} />
          {showRefreshIndicator ? (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                pr: 0.5
              }}>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  color: muiAlpha(
                    theme.palette.text.secondary,
                    theme.palette.mode === 'dark' ? 0.7 : 0.55
                  )
                }}>
                {t('refreshIn', { defaultValue: 'Refresh in' })}
              </Typography>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  position: 'relative'
                }}>
                <svg viewBox="0 0 36 36" width="100%" height="100%" role="presentation">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={muiAlpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.2 : 0.12
                    )}
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={muiAlpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.7 : 0.85
                    )}
                    strokeWidth="3.5"
                    strokeDasharray={`${remainingRadians * 15} ${Math.PI * 30}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="11.5"
                    fill={muiAlpha(theme.palette.background.paper, 0.95)}
                  />
                  <path
                    d="M18 18 L18 11"
                    stroke={muiAlpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.75 : 0.7
                    )}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M18 18 L${18 + 5 * Math.sin(remainingRadians)} ${18 - 5 * Math.cos(remainingRadians)}`}
                    stroke={muiAlpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.95 : 0.9
                    )}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Box>
            </Box>
          ) : (
            <div></div>
          )}
        </SectionHeader>

        {isHashrateLoading ? (
          <ProgressLoader value={hashrates.length} />
        ) : !hasData ? (
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
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              flexGrow: 1,
              minHeight: 0,
              overflowY: 'auto',
              maxHeight: { xs: 'none', lg: listMaxHeight },
              pr: { xs: 0, lg: showScrollHint ? 0.5 : 0 },
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
            {workers.map((workerData, index) => {
              const accentColor = workerColorMap[workerData.worker] || theme.palette.primary.main;
              const accentSurface =
                theme.palette.mode === 'dark'
                  ? muiAlpha(accentColor, 0.2)
                  : muiAlpha(accentColor, 0.12);
              const accentBorder = muiAlpha(accentColor, theme.palette.mode === 'dark' ? 0.4 : 0.3);
              const userAgentLabel = beautifyWorkerUserAgent(workerData.userAgent);
              const showAgent = !!userAgentLabel;
              const showLabelInfo = true;
              const hashratePercent =
                typeof workerData.hashratePercent === 'number'
                  ? workerData.hashratePercent
                  : undefined;
              const percentLabel =
                typeof hashratePercent === 'number'
                  ? hashratePercent >= 10
                    ? Math.round(hashratePercent).toString()
                    : hashratePercent >= 1
                      ? hashratePercent.toFixed(1).replace(/\.0$/, '')
                      : hashratePercent.toFixed(2)
                  : undefined;
              const percentBadgeConfig =
                typeof hashratePercent === 'number'
                  ? (() => {
                      const value = hashratePercent;
                      const palette = theme.palette;
                      const badgePalette = palette.customBadge as {
                        fail: string;
                        warn: string;
                        success: string;
                        exceed: string;
                      };
                      let baseColor = badgePalette?.fail;
                      if (value >= 100) {
                        baseColor = badgePalette?.exceed;
                      } else if (value >= 80) {
                        baseColor = badgePalette?.success;
                      } else if (value >= 50) {
                        baseColor = badgePalette?.warn;
                      }
                      baseColor = baseColor ?? palette.primary.main;
                      const gradientStart = muiAlpha(
                        baseColor,
                        palette.mode === 'dark' ? 0.3 : 0.18
                      );
                      const gradientEnd = muiAlpha(baseColor, palette.mode === 'dark' ? 0.1 : 0.07);
                      const borderColor = muiAlpha(
                        baseColor,
                        palette.mode === 'dark' ? 0.55 : 0.32
                      );
                      const textColor =
                        palette.mode === 'dark' ? muiAlpha(palette.common.white, 0.9) : baseColor;

                      return {
                        gradientStart,
                        gradientEnd,
                        borderColor,
                        textColor,
                        dotColor: baseColor
                      };
                    })()
                  : undefined;

              return (
                <Box
                  key={workerData.worker}
                  sx={{
                    borderRadius: 2,
                    px: 1.4,
                    pt: 1.4,
                    background: accentSurface,
                    border: `1px solid ${accentBorder}`,
                    boxShadow: `0 10px 26px -18px ${muiAlpha(accentColor, 0.5)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.9,
                    mb: {
                      xs: index === workers.length - 1 ? 1 : 0.6,
                      lg: index === workers.length - 1 ? 2 : 0.6
                    },
                    pb: index === workers.length - 1 ? 1 : 0.5
                  }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1
                    }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.6,
                        minWidth: 0
                      }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          letterSpacing: '0.01em',
                          color: accentColor,
                          textTransform: 'capitalize',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75
                        }}>
                        <WorkerCircuitIcon
                          width={24}
                          height={24}
                          strokeColor={accentColor}
                          accentColor={accentColor}
                          style={{
                            filter:
                              theme.palette.mode === 'dark'
                                ? 'drop-shadow(0 3px 5px rgba(0,0,0,0.45))'
                                : 'drop-shadow(0 3px 6px rgba(70,78,115,0.25))'
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            paddingTop: 0.2
                          }}>
                          {workerData.worker || t('workersInsights.unknownWorker')}
                        </Box>
                      </Typography>
                      {showAgent && (
                        <Typography
                          variant="caption"
                          title={workerData.userAgent ?? undefined}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            alignSelf: 'flex-start',
                            letterSpacing: '0.06em',
                            color:
                              theme.palette.mode === 'dark'
                                ? muiAlpha('#ffffff', 0.75)
                                : muiAlpha(theme.palette.text.primary, 0.7)
                          }}>
                          <Box
                            component="span"
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: muiAlpha(accentColor, 0.8)
                            }}
                          />
                          <Box
                            component="span"
                            sx={{
                              whiteSpace: 'nowrap'
                            }}>
                            {userAgentLabel}
                          </Box>
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 0.3,
                        py: 0.18
                      }}>
                      <Chip
                        size="small"
                        label={
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: percentLabel && percentBadgeConfig ? 0.6 : 0.45,
                              px: 0.85,
                              py: 0.42
                            }}>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: lighten(
                                  accentColor,
                                  theme.palette.mode === 'dark' ? 0.08 : 0.32
                                )
                              }}>
                              {workerData.hashrate !== undefined &&
                              !Number.isNaN(workerData.hashrate)
                                ? formatHashrate(workerData.hashrate)
                                : '--'}
                            </Typography>
                            {percentLabel && percentBadgeConfig && (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.35,
                                  px: 0.55,
                                  py: 0.2,
                                  minWidth: 46,
                                  borderRadius: 999,
                                  marginRight: -0.8,
                                  background: `linear-gradient(135deg, ${percentBadgeConfig.gradientStart} 0%, ${percentBadgeConfig.gradientEnd} 100%)`,
                                  color: percentBadgeConfig.textColor,
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? `0 8px 18px -14px ${muiAlpha(percentBadgeConfig.borderColor, 0.8)}`
                                      : `0 10px 20px -16px ${muiAlpha(percentBadgeConfig.borderColor, 0.5)}`
                                }}>
                                <Box
                                  component="span"
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: percentBadgeConfig.dotColor,
                                    boxShadow: `0 0 0 4px ${muiAlpha(
                                      percentBadgeConfig.dotColor,
                                      theme.palette.mode === 'dark' ? 0.16 : 0.12
                                    )}`
                                  }}
                                />
                                <Box component="span" sx={{ display: 'inline-flex', gap: 0.2 }}>
                                  {percentLabel}
                                  <Box component="span" sx={{ fontSize: '0.58rem' }}>
                                    %
                                  </Box>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        }
                        sx={{
                          px: 0.7,
                          py: 0.3,
                          borderRadius: 14,
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          background: muiAlpha(
                            accentColor,
                            theme.palette.mode === 'dark' ? 0.24 : 0.12
                          ),
                          boxShadow:
                            theme.palette.mode === 'dark'
                              ? `0 6px 18px -12px ${muiAlpha(accentColor, 0.65)}`
                              : `0 12px 24px -18px ${muiAlpha(accentColor, 0.55)}`,
                          color:
                            theme.palette.mode === 'dark'
                              ? '#ffffff'
                              : muiAlpha(theme.palette.text.primary, 0.82),
                          '& .MuiChip-label': {
                            px: 0,
                            py: 0,
                            display: 'inline-flex',
                            alignItems: 'center'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                  <Divider
                    sx={{
                      borderColor: muiAlpha(accentColor, 0.25),
                      borderStyle: 'dashed'
                    }}
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 1
                    }}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: muiAlpha(theme.palette.text.secondary, 0.8),
                          display: 'flex',
                          alignItems: 'center',
                          gap: showLabelInfo ? 0.4 : 0
                        }}>
                        {t('workersInsights.sharenotes')}
                        <Tooltip
                          arrow
                          placement="top"
                          title={t('workersInsights.info.sharenotes', {
                            defaultValue: 'Latest sharenote from this worker.'
                          })}>
                          <InfoOutlinedIcon
                            fontSize="inherit"
                            sx={{
                              fontSize: '0.85rem',
                              opacity: theme.palette.mode === 'dark' ? 0.75 : 0.6,
                              color: muiAlpha(theme.palette.text.secondary, 0.9)
                            }}
                          />
                        </Tooltip>
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: workerData.hashrateFromNoteDisplay ? 0.55 : 0
                        }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                          <ShareNoteLabel value={workerData.sharenote} placeholder="--" />
                        </Typography>
                        {workerData.hashrateFromNoteDisplay && (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.32,
                              px: 0.7,
                              py: 0.2,
                              borderRadius: 999,
                              backgroundColor: muiAlpha(
                                accentColor,
                                theme.palette.mode === 'dark' ? 0.18 : 0.12
                              ),
                              color:
                                theme.palette.mode === 'dark'
                                  ? muiAlpha('#ffffff', 0.85)
                                  : muiAlpha(accentColor, 0.85),
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              textTransform: 'none',
                              minHeight: 24
                            }}>
                            <BoltIcon sx={{ fontSize: '0.88rem', transform: 'translateY(1px)' }} />
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                letterSpacing: 0,
                                textTransform: 'none',
                                lineHeight: 1
                              }}>
                              {workerData.hashrateFromNoteDisplay}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: muiAlpha(theme.palette.text.secondary, 0.8),
                          display: 'flex',
                          alignItems: 'center',
                          gap: showLabelInfo ? 0.4 : 0
                        }}>
                        {t('workersInsights.meanTime')}
                        {showLabelInfo && (
                          <Tooltip
                            arrow
                            placement="top"
                            title={t('workersInsights.info.meanTime', {
                              defaultValue: 'Average time this worker takes to print a sharenote.'
                            })}>
                            <InfoOutlinedIcon
                              fontSize="inherit"
                              sx={{
                                fontSize: '0.85rem',
                                opacity: theme.palette.mode === 'dark' ? 0.75 : 0.6,
                                color: muiAlpha(theme.palette.text.secondary, 0.9)
                              }}
                            />
                          </Tooltip>
                        )}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: workerData.meanSharenote ? 0.4 : 0
                        }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {formatMeanTime(workerData.meanTime)}
                        </Typography>
                        {workerData.meanSharenote && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.25,
                              px: 0.5,
                              py: 0.12,
                              borderRadius: 999,
                              backgroundColor: muiAlpha(
                                accentColor,
                                theme.palette.mode === 'dark' ? 0.16 : 0.09
                              ),
                              color:
                                theme.palette.mode === 'dark'
                                  ? muiAlpha('#ffffff', 0.82)
                                  : muiAlpha(accentColor, 0.8),
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              textTransform: 'none'
                            }}>
                            ~
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                letterSpacing: 0,
                                textTransform: 'none'
                              }}>
                              <ShareNoteLabel value={workerData.meanSharenote} placeholder="--" />
                            </Box>
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: muiAlpha(theme.palette.text.secondary, 0.8),
                          display: 'flex',
                          alignItems: 'center',
                          gap: showLabelInfo ? 0.4 : 0
                        }}>
                        {t('workersInsights.lastShare')}
                        {showLabelInfo && (
                          <Tooltip
                            arrow
                            placement="top"
                            title={t('workersInsights.info.lastShare', {
                              defaultValue: 'Time since the worker last printed a sharenote.'
                            })}>
                            <InfoOutlinedIcon
                              fontSize="inherit"
                              sx={{
                                fontSize: '0.85rem',
                                opacity: theme.palette.mode === 'dark' ? 0.75 : 0.6,
                                color: muiAlpha(theme.palette.text.secondary, 0.9)
                              }}
                            />
                          </Tooltip>
                        )}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const date = toDateFromMaybeSeconds(workerData.lastShareTimestamp);
                          if (!date) return '--';
                          return formatRelativeTime(date);
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
            {showScrollHint && <Box sx={{ height: 8 }} />}
          </Box>
        )}
      </Box>
    </StyledCard>
  );
};

export default WorkersInsights;
