import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import InfoHeader from '@components/common/InfoHeader';
import StackedTotalTooltip from '@components/charts/StackedTotalTooltip';
import { useSelector } from '@store/store';
import { getAddress, getIsSharesLoading, getShares } from '@store/app/AppSelectors';
import type { IShareEvent } from '@objects/interfaces/IShareEvent';
import { useTheme } from '@mui/material/styles';
import { aggregateSharesByInterval } from '@utils/aggregators';
import { generateStackColors } from '@utils/colors';

type Props = {
  intervalMinutes?: number; // default 60 min
};

const SharenoteChart = ({ intervalMinutes = 60 }: Props) => {
  const { t } = useTranslation();
  const shares = useSelector(getShares) as IShareEvent[];
  const isLoading = useSelector(getIsSharesLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

  const intervalSec = Math.max(1, Math.floor(intervalMinutes * 60));
  const windowSec = 24 * 60 * 60;

  const { xLabels, workers, dataByWorker } = useMemo(
    () => aggregateSharesByInterval(shares || [], intervalSec, windowSec, undefined, { fallbackToLatest: true }),
    [shares, intervalSec]
  );
  const colors = useMemo(() => generateStackColors(workers.length, theme), [workers.length, theme]);
  const series = useMemo(
    () =>
      workers.map((w, i) => ({
        id: w,
        label: w,
        data: dataByWorker[i],
        color: colors[i % colors.length],
        stack: 'shares'
      })),
    [workers, dataByWorker, colors]
  );

  const hasData = xLabels.length > 0 && series.length > 0;

  const formatShareValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const flc = (value / 100000000).toFixed(8);
    return `${flc} FLC`;
  };
  const formatShareValueNumber = (value: number) => `${(value / 100000000).toFixed(8)} FLC`;

  return (
    <StyledCard>
      <Box component="section" sx={{ p: 2, minHeight: '150px', justifyContent: 'center' }}>
        <SectionHeader>
          <InfoHeader title={t('sharenotesSummary')} tooltip={t('info.sharenotesSummary')} />
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={shares.length} />}        
        {!isLoading &&
          (hasData && address ? (
            <Box sx={{ width: '100%', height: 300 }}>
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
                height={300}
                margin={{ bottom: 40, left: 10, right: 10, top: 10 }}
                slots={{ tooltip: StackedTotalTooltip as any }}
                slotProps={{ tooltip: { trigger: 'axis', valueFormatter: formatShareValueNumber } as any }}
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

export default SharenoteChart;
