import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { getAddress, getIsPayoutsLoading, getPayouts } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { lokiToFlcNumber, formatK } from '@utils/Utils';
import { fromEpoch } from '@utils/time';
// Colors now taken from theme.palette
import type { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';

type PayoutsChartProps = { intervalMinutes?: number };

const PayoutsChart = ({ intervalMinutes = 60 }: PayoutsChartProps) => {
  const { t } = useTranslation();
  const payouts = useSelector(getPayouts) as IPayoutEvent[];
  const isLoading = useSelector(getIsPayoutsLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

  const aggregateByMinutes = (events: IPayoutEvent[], minutes: number) => {
    // Gap-based bucketing: sort chronologically; start a bucket at first event;
    // keep adding while the gap with previous event is < interval; otherwise start new bucket.
    const intervalSec = Math.max(1, Math.floor(minutes)) * 60;

    // Normalize and sort events by timestamp ascending
    const normalized = events
      .map((e) => {
        const ts =
          typeof e.timestamp === 'number' ? (e.timestamp as any) : parseInt(e.timestamp as any, 10);
        const sec = ts > 1e12 ? Math.floor(ts / 1000) : ts;
        return { sec, amount: e.amount || 0 };
      })
      .sort((a, b) => a.sec - b.sec);

    const buckets: { startSec: number; totalAmount: number }[] = [];
    let currentStart = 0;
    let currentTotal = 0;
    let prevSec = 0;

    for (let i = 0; i < normalized.length; i++) {
      const { sec, amount } = normalized[i];
      if (i === 0) {
        currentStart = sec;
        currentTotal = amount;
      } else {
        const gap = sec - prevSec;
        if (gap >= intervalSec) {
          // close previous bucket and start a new one
          buckets.push({ startSec: currentStart, totalAmount: currentTotal });
          currentStart = sec;
          currentTotal = amount;
        } else {
          currentTotal += amount;
        }
      }
      prevSec = sec;
    }

    // push the last bucket if any events exist
    if (normalized.length > 0) {
      buckets.push({ startSec: currentStart, totalAmount: currentTotal });
    }

    const x = buckets.map((b) => fromEpoch(b.startSec).format('L LT'));
    const amount = buckets.map((b) => lokiToFlcNumber(b.totalAmount));
    return { x, amount };
  };

  const { x, amount } = useMemo((): { x: string[]; amount: number[] } => {
    if (!isLoading && payouts && payouts.length > 0) {
      return aggregateByMinutes(payouts, intervalMinutes);
    }
    return { x: [], amount: [] };
  }, [isLoading, payouts, intervalMinutes]);
  const hasData = x.length > 0 && amount.length > 0;

  return (
    <StyledCard>
      <Box component="section" sx={{ p: 2, minHeight: '150px', justifyContent: 'center' }}>
        <SectionHeader>
          <Box>{t('payoutsSummary')}</Box>
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={payouts.length} />}
        {!isLoading &&
          (hasData && address ? (
            <Box sx={{ width: '100%', height: 300 }}>
              <BarChart
                series={[
                  {
                    data: amount,
                    label: t('profit'),
                    id: 'amount',
                    color: theme.palette.primary.main
                  }
                ]}
                xAxis={[{ scaleType: 'band', data: x }]}
                yAxis={[{ width: 50, valueFormatter: formatK }]}
                height={300}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 1,
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
