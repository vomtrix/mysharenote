import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import InfoHeader from '@components/common/InfoHeader';
import { getAddress, getIsPayoutsLoading, getPayouts } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { lokiToFlcNumber, formatK } from '@utils/helpers';
import { fromEpoch, toSeconds } from '@utils/time';
// Colors now taken from theme.palette
import type { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';

const PayoutsChart = () => {
  const { t } = useTranslation();
  const payouts = useSelector(getPayouts) as IPayoutEvent[];
  const isLoading = useSelector(getIsPayoutsLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

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
    const amount = sortedBuckets.map((bucket) => lokiToFlcNumber(bucket.totalAmount));
    return { x, amount };
  };

  const formatPayoutValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const formatted = formatK(value);
    return formatted ? `${formatted} FLC` : '';
  };

  const { x, amount } = useMemo((): { x: string[]; amount: number[] } => {
    if (!isLoading && payouts && payouts.length > 0) {
      return aggregateByTxId(payouts);
    }
    return { x: [], amount: [] };
  }, [isLoading, payouts]);
  const hasData = x.length > 0 && amount.length > 0;

  return (
    <StyledCard>
      <Box component="section" sx={{ p: 2, minHeight: '150px', justifyContent: 'center' }}>
        <SectionHeader>
          <InfoHeader title={t('payoutsSummary')} tooltip={t('info.payoutsSummary')} />
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={payouts.length} />}
        {!isLoading &&
          (hasData && address ? (
            <Box sx={{ width: '100%', height: 300 }}>
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
                height={300}
                margin={{ bottom: 40, left: 10, right: 10, top: 10 }}
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
