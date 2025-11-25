import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Skeleton } from '@mui/material';
import HashrateChart from '@components/charts/HashrateChart';
import PayoutsChart from '@components/charts/PayoutsChart';
import PayoutsTable from '@components/tables/payouts/PayoutsTable';
import SharesTable from '@components/tables/shares/SharesTable';
import LiveSharenotes from '@components/workers/LiveSharenotes';
import WorkersInsights from '@components/workers/WorkersInsights';
import WorkersProfit from '@components/workers/WorkersProfit';
import { useHasRelayConfig } from '@hooks/useHasRelayConfig';
import { useNotification } from '@hooks/UseNotificationHook';
import { addAddress, clearAddress } from '@store/app/AppReducer';
import { getAddress, getRelayReady, getSettings, getSkeleton } from '@store/app/AppSelectors';
import {
  connectRelay,
  getHashrates,
  getLastBlockHeight,
  getLiveSharenotes,
  getPayouts,
  getShares,
  stopHashrates,
  stopLiveSharenotes,
  stopPayouts,
  stopShares
} from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import { validateAddress } from '@utils/helpers';

const AddressPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const hasConfig = useHasRelayConfig();
  const { addr } = router.query;
  const currentAddress = useSelector(getAddress);
  const settings = useSelector(getSettings);
  const enableSkeleton = useSelector(getSkeleton);
  const relayIsReady = useSelector(getRelayReady);
  const { showError } = useNotification();
  const hasConnectedRelayRef = useRef(false);
  const rowHeights = {
    xs: 220,
    lgTall: 320,
    lgMedium: 280,
    lgShort: 220
  };
  const cardGridStyles = {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', lg: '7fr 4fr' },
    gridAutoRows: 'auto',
    gap: { xs: 3, lg: 3 },
    alignItems: 'stretch',
    mb: { xs: 0, lg: 3 },
    '& > *': { minWidth: 0 }
  };
  const fullHeightWrapper = {
    display: 'flex',
    '& > *': { flexGrow: 1, width: '100%', height: '100%' }
  };

  useEffect(() => {
    if (!hasConfig || !addr || typeof addr !== 'string') return;
    if (!validateAddress(addr, settings.network)) {
      dispatch(clearAddress());
      showError({
        message: t('invalidAddress'),
        options: {
          position: 'bottom-center',
          toastId: 'invalid-address'
        }
      });
      return;
    }
    dispatch(addAddress(addr));
  }, [addr, hasConfig]);

  useEffect(() => {
    if (currentAddress && hasConfig && hasConnectedRelayRef.current && relayIsReady) {
      dispatch(getLastBlockHeight());
      dispatch(stopHashrates());
      dispatch(stopShares());
      dispatch(stopLiveSharenotes());
      dispatch(stopPayouts());
      dispatch(getHashrates(currentAddress));
      dispatch(getShares(currentAddress));
      dispatch(getLiveSharenotes(currentAddress));
      dispatch(getPayouts(currentAddress));
    }
  }, [currentAddress, hasConfig, hasConnectedRelayRef, relayIsReady]);

  useEffect(() => {
    if (hasConfig && !hasConnectedRelayRef.current) {
      dispatch(connectRelay(settings.relay));
      hasConnectedRelayRef.current = true;
    }
  }, [hasConfig]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        marginBottom: '10px',
        justifyContent: 'center'
      }}>
      {enableSkeleton ? (
        <Box sx={cardGridStyles}>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '1' },
              height: { xs: rowHeights.xs, lg: rowHeights.lgTall }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '1 / span 2' },
              height: {
                xs: rowHeights.xs,
                lg: `calc(${rowHeights.lgTall * 2}px + 24px)`
              }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '2' },
              height: { xs: rowHeights.xs, lg: rowHeights.lgTall }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '3' },
              height: { xs: rowHeights.xs, lg: rowHeights.lgMedium }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '3' },
              height: { xs: rowHeights.xs, lg: rowHeights.lgMedium }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '4' },
              height: { xs: rowHeights.xs - 20, lg: rowHeights.lgShort }
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '4' },
              height: { xs: rowHeights.xs - 20, lg: rowHeights.lgShort }
            }}
          />
        </Box>
      ) : (
        <Box sx={cardGridStyles}>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '1' },
              minHeight: { lg: 320 },
              ...fullHeightWrapper
            }}>
            <HashrateChart />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '1 / span 2' },
              ...fullHeightWrapper
            }}>
            <WorkersInsights />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '2' },
              minHeight: { lg: 320 },
              ...fullHeightWrapper
            }}>
            <WorkersProfit />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '3' },
              ...fullHeightWrapper
            }}>
            <SharesTable />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '3' },
              minHeight: { lg: 280 },
              ...fullHeightWrapper
            }}>
            <LiveSharenotes />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '4' },
              ...fullHeightWrapper
            }}>
            <PayoutsTable />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '4' },
              ...fullHeightWrapper
            }}>
            <PayoutsChart />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AddressPage;
