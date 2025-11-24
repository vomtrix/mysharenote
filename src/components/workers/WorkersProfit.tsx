import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
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

  const { xLabels, workers, dataByWorker } = useMemo(
    () =>
      aggregateSharesByInterval(shares || [], intervalSec, windowSec, undefined, {
        fallbackToLatest: true
      }),
    [shares, intervalSec]
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
    const flc = (value / 100000000).toFixed(8);
    return `${flc} FLC`;
  };
  const formatShareValueNumber = (value: number) => `${(value / 100000000).toFixed(8)} FLC`;

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
        <SectionHeader>
          <InfoHeader title={t('workersProfit')} tooltip={t('info.workersProfit')} />
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
