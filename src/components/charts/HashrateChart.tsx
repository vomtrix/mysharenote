import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import CustomChart from '@components/common/CustomChart';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { getAddress, getHashrates, getIsHashratesLoading } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { useTheme } from '@mui/material/styles';
import { calculateSMA, formatHashrate } from '@utils/Utils';

const HashrateChart = () => {
  const { t } = useTranslation();
  const hashrates = useSelector(getHashrates);
  const isLoading = useSelector(getIsHashratesLoading);
  const address = useSelector(getAddress);
  const theme = useTheme();

  const getDatapoints = (events: any[]): any[] => {
    const tzOffsetSeconds = new Date().getTimezoneOffset() * 60;
    const lineDataPoints = events
      .map((event: any) => ({
        // event.timestamp is expected to be UTCTimestamp (seconds)
        time: event.timestamp - tzOffsetSeconds,
        value: event.hashrate
      }))
      .sort(
        (a: { time: number; value: number }, b: { time: number; value: number }) => a.time - b.time
      );
    return calculateSMA(lineDataPoints, 50);
  };

  return (
    <StyledCard>
      <Box
        component="section"
        sx={{
          p: 2,
          minHeight: '150px',
          justifyContent: 'center'
        }}>
        <SectionHeader>
          <Box>{t('hashrateChart')}</Box>
        </SectionHeader>
        {isLoading && address && <ProgressLoader value={hashrates.length} />}
        {!isLoading &&
          (hashrates.length > 0 && address ? (
            <CustomChart
              dataPoints={getDatapoints(hashrates)}
              height={300}
              lineColor={theme.palette.primary.main}
              valueFormatter={formatHashrate}
            />
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

export default HashrateChart;
