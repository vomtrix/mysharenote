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

const PayoutsChart = ({ intervalMinutes = 1440 }: PayoutsChartProps) => {
  const { t } = useTranslation();
  const payouts = useSelector(getPayouts) as IPayoutEvent[];
  const isLoading = useSelector(getIsPayoutsLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

  const aggregateByMinutes = (events: IPayoutEvent[], minutes: number) => {
    const intervalSec = Math.max(1, Math.floor(minutes)) * 60;
    const map = new Map<number, [number, number]>();
    for (const e of events) {
      const ts =
        typeof e.timestamp === 'number' ? (e.timestamp as any) : parseInt(e.timestamp as any, 10);
      const sec = ts > 1e12 ? Math.floor(ts / 1000) : ts;
      const bucket = Math.floor(sec / intervalSec) * intervalSec;
      const [a, f] = map.get(bucket) || [0, 0];
      map.set(bucket, [a + (e.amount || 0), f + (e.fee || 0)]);
    }
    const entries = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    const x = entries.map(([s]) => fromEpoch(s).format('L LTS'));
    const amount = entries.map(([, [am]]) => lokiToFlcNumber(am));
    const fee = entries.map(([, [, fe]]) => fe);
    return { x, amount, fee };
  };

  const { x, amount, fee } = useMemo((): { x: string[]; amount: number[]; fee: number[] } => {
    if (!isLoading && payouts && payouts.length > 0) {
      return aggregateByMinutes(payouts, intervalMinutes);
    }
    return { x: [], amount: [], fee: [] };
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
                  },
                  {
                    data: fee,
                    label: t('fee'),
                    id: 'fee',
                    color: theme.palette.secondary.main
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
