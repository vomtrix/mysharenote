import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { getChainIconPath, getChainMetadata, getChainName } from '@constants/chainIcons';
import { getAddress, getIsPayoutsLoading, getPayouts } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { formatK } from '@utils/helpers';
import { fromEpoch, toSeconds } from '@utils/time';
// Colors now taken from theme.palette

const PayoutsChart = () => {
  const { t } = useTranslation();
  const payouts = useSelector(getPayouts) as IPayoutEvent[];
  const isLoading = useSelector(getIsPayoutsLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartHeight, setChartHeight] = useState(260);
  const [selectedChain, setSelectedChain] = useState<string | undefined>(undefined);
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

    (payouts || []).forEach((payout) => {
      if ((payout.amount ?? 0) <= 0) return;
      const chainKey = normalizeChainKey(payout.chainId);
      const entry = buckets.get(chainKey) ?? { totalAmount: 0, count: 0 };
      entry.totalAmount += payout.amount || 0;
      entry.count += 1;
      entry.sampleChainId = entry.sampleChainId ?? payout.chainId;
      buckets.set(chainKey, entry);
    });

    const sorted = Array.from(buckets.entries()).sort((a, b) => {
      if (b[1].totalAmount !== a[1].totalAmount) return b[1].totalAmount - a[1].totalAmount;
      return b[1].count - a[1].count;
    });

    const options = sorted.map(([value, stats]) => {
      const meta = getChainMetadata(stats.sampleChainId ?? value);
      const labelName = toTitleCase(meta?.name ?? value);
      const label = labelName || t('liveSharenotes.unknownChain');
      const icon = getChainIconPath(stats.sampleChainId ?? value) ?? getChainIconPath(value);
      return { value, label, icon, meta };
    });

    return { chainOptions: options, defaultChain: sorted[0]?.[0] };
  }, [payouts, t, normalizeChainKey]);

  useEffect(() => {
    if (!chainOptions.length) {
      if (selectedChain !== undefined) setSelectedChain(undefined);
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

  const activeChain = selectedChain ?? defaultChain ?? 'flokicoin';
  const activeChainMeta = useMemo(() => {
    const option = chainOptions.find((opt) => opt.value === activeChain);
    return option?.meta ?? getChainMetadata(activeChain);
  }, [activeChain, chainOptions]);
  const decimals = Math.max(0, activeChainMeta?.decimals ?? 8);
  const currencySymbol = activeChainMeta?.currencySymbol ?? 'FLC';
  const divisor = 10 ** decimals;

  const filteredPayouts = useMemo(() => {
    const target = normalizeChainKey(activeChain);
    return (payouts || []).filter((payout) => normalizeChainKey(payout.chainId) === target);
  }, [activeChain, payouts, normalizeChainKey]);

  const aggregateByTxId = (events: IPayoutEvent[]) => {
    // Merge all payouts that belong to the same transaction id into one bar.
    const buckets = new Map<
      string,
      { txId: string; startSec: number | null; endSec: number | null; totalAmount: number }
    >();

    events.forEach((event) => {
      const txId = event.txId || event.id;
      if (!txId) {
        return;
      }
      const amount = event.amount || 0;
      const sec = toSeconds(event.timestamp);
      const existing = buckets.get(txId);

      if (existing) {
        existing.totalAmount += amount;
        if (sec !== null && (existing.startSec === null || sec < existing.startSec)) {
          existing.startSec = sec;
        }
        if (sec !== null && (existing.endSec === null || sec > existing.endSec)) {
          existing.endSec = sec;
        }
      } else {
        buckets.set(txId, { txId, startSec: sec, endSec: sec, totalAmount: amount });
      }
    });

    const sortedBuckets = Array.from(buckets.values()).sort((a, b) => {
      if (a.endSec !== null && b.endSec !== null && a.endSec !== b.endSec) {
        return a.endSec - b.endSec;
      }
      if (a.endSec === null && b.endSec !== null) return 1;
      if (a.endSec !== null && b.endSec === null) return -1;
      return a.txId.localeCompare(b.txId);
    });

    const x = sortedBuckets.map((bucket, index) => {
      if (bucket.endSec !== null) {
        return fromEpoch(bucket.endSec).format('MMM D, HH:mm:ss');
      }
      return `Unknown time #${index + 1}`;
    });
    const amount = sortedBuckets.map((bucket) => (bucket.totalAmount || 0) / divisor);
    return { x, amount };
  };

  const formatPayoutValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const formatted = value >= 1 ? formatK(value) ?? value.toFixed(2) : value.toFixed(6);
    return currencySymbol ? `${formatted} ${currencySymbol}` : formatted;
  };

  const { x, amount } = useMemo((): { x: string[]; amount: number[] } => {
    if (!isLoading && filteredPayouts && filteredPayouts.length > 0) {
      return aggregateByTxId(filteredPayouts);
    }
    return { x: [], amount: [] };
  }, [isLoading, filteredPayouts, divisor]);
  const hasData = x.length > 0 && amount.length > 0;

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const updateHeight = () => {
      const bounds = container.getBoundingClientRect();
      if (!bounds) return;
      const paddedHeight = Math.max(240, Math.floor(bounds.height));
      setChartHeight(paddedHeight);
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [hasData, isLoading]);

  return (
    <StyledCard
      sx={{
        height: { xs: 'auto', lg: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { xs: 380, sm: 420, lg: '100%' },
        mb: { xs: 3, lg: 0 }
      }}>
      <Box
        component="section"
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: { xs: 200, sm: 220, md: 260 }
        }}>
        <SectionHeader>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            flexWrap="wrap">
            <InfoHeader title={t('payoutsSummary')} tooltip={t('info.payoutsSummary')} />
            {chainOptions.length > 0 ? (
              <Select
                value={activeChain}
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
                  if (!option) {
                    const fallbackLabel =
                      toTitleCase(getChainName(value) ?? String(value) ?? 'flokicoin') ??
                      t('liveSharenotes.unknownChain');
                    return fallbackLabel;
                  }
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
            ) : null}
          </Box>
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={payouts.length} />}
        {!isLoading &&
          (hasData && address ? (
            <Box
              ref={chartContainerRef}
              sx={{
                width: '100%',
                flexGrow: 1,
                minHeight: { xs: 200, sm: 240, md: 280 },
                display: 'flex'
              }}>
              <BarChart
                series={[
                  {
                    data: amount,
                    // label: t('profit'),
                    id: 'amount',
                    color: theme.palette.primary.main,
                    valueFormatter: formatPayoutValue
                  }
                ]}
                xAxis={[
                  {
                    scaleType: 'band',
                    data: x,
                    tickLabelStyle: { fontSize: 12 }
                  }
                ]}
                yAxis={[{ position: 'none' }]}
                height={chartHeight}
                margin={{ bottom: 18, left: 12, right: 12, top: 10 }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                flexGrow: 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                fontSize: '0.9rem'
              }}>
              No data
            </Box>
          ))}
      </Box>
    </StyledCard>
  );
};

export default PayoutsChart;
