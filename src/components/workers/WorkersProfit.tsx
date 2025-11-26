import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { getChainIconPath, getChainMetadata, getChainName } from '@constants/chainIcons';
import type { IShareEvent } from '@objects/interfaces/IShareEvent';
import { getAddress, getIsSharesLoading, getShares } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { aggregateSharesByInterval } from '@utils/aggregators';
import { getWorkerColor } from '@utils/colors';

type Props = {
  intervalMinutes?: number; // default 60 min
};

const WorkersProfit = ({ intervalMinutes = 60 }: Props) => {
  const { t } = useTranslation();
  const shares = useSelector(getShares) as IShareEvent[];
  const isLoading = useSelector(getIsSharesLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

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
    if (!activeChain) return shares || [];
    return (shares || []).filter((share) => normalizeChainKey(share.chainId) === activeChain);
  }, [shares, activeChain, normalizeChainKey]);

  const { xLabels, workers, dataByWorker } = useMemo(
    () =>
      aggregateSharesByInterval(filteredShares || [], intervalSec, windowSec, undefined, {
        fallbackToLatest: true
      }),
    [filteredShares, intervalSec]
  );
  const series = useMemo(
    () =>
      workers.map((w, i) => ({
        id: w,
        label: w,
        data: dataByWorker[i],
        color: getWorkerColor(theme, w),
        stack: 'shares'
      })),
    [workers, dataByWorker, theme]
  );

  const hasData = xLabels.length > 0 && series.length > 0;

  const formatShareValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const formatted = (value / divisor).toFixed(precision);
    return currencySymbol ? `${formatted} ${currencySymbol}` : formatted;
  };
  const formatShareValueNumber = (value: number) =>
    currencySymbol ? `${(value / divisor).toFixed(precision)} ${currencySymbol}` : (value / divisor).toFixed(precision);

  return (
    <StyledCard sx={{ height: { xs: 'auto', lg: 320 } }}>
      <Box
        component="section"
        sx={{
          p: 2,
          justifyContent: 'flex-start',
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
                width: { xs: 'auto', sm: 'auto' },
                minWidth: { xs: 130, sm: 170 },
                maxWidth: { xs: 220, sm: 240 },
                flexShrink: 1,
                flexGrow: 0
              }}>
              <Select
                value={activeChain ?? ''}
                onChange={(event) => setSelectedChain(String(event.target.value))}
                size="small"
                displayEmpty
                fullWidth
                MenuProps={{
                  PaperProps: {
                    sx: { maxHeight: 320 }
                  }
                }}
              sx={{
                  ml: { xs: 0, md: 'auto' },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  width: '100%',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 6px 18px rgba(0,0,0,0.35)'
                      : '0 6px 18px rgba(0,0,0,0.08)',
                  '.MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.65,
                    py: { xs: 0.55, sm: 0.7 },
                    px: { xs: 0.95, sm: 1.2 },
                    fontWeight: 700,
                    minHeight: 36
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
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{ maxWidth: '100%' }}>
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
                minHeight: 0,
                display: 'flex',
                maxHeight: 250,
                height: 250
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
                  tooltip: { trigger: 'axis', valueFormatter: formatShareValueNumber } as any
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
