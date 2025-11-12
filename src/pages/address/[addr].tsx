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
  const rightColumnStyles = {
    flex: { xs: 'auto', lg: 4 },
    maxWidth: { lg: 'calc((4 / 11) * 100%)' },
    display: 'flex',
    flexShrink: 1,
    height: { xs: 'auto', lg: 320 },
    '& > *': {
      flexGrow: 1,
      height: '100%',
      marginBottom: 0
    }
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
        marginBottom: '50px',
        justifyContent: 'center'
      }}>
      {enableSkeleton ? (
        <>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 50, width: '100%', marginBottom: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 200, width: '100%', marginBottom: 3 }}
          />
        </>
      ) : (
        <HashrateChart />
      )}

      {enableSkeleton ? (
        <>
          <Skeleton variant="rounded" animation="wave" sx={{ height: 50, width: '100%', mb: 1 }} />
          <Skeleton variant="rounded" animation="wave" sx={{ height: 200, width: '100%', mb: 3 }} />
        </>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 0, lg: 3 },
            alignItems: 'stretch',
            mb: { xs: 0, lg: 3 }
          }}>
          <Box
            sx={{
              flex: { xs: 'auto', lg: 7 },
              minWidth: 0,
              flexShrink: 1,
              display: 'flex',
              height: { xs: 'auto', lg: 320 },
              '& > *': { flexGrow: 1, height: '100%', mb: 0 }
            }}>
            <WorkersProfit />
          </Box>
          <Box sx={rightColumnStyles}>
            <WorkersInsights />
          </Box>
        </Box>
      )}

      {enableSkeleton ? (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 1, lg: 3 },
            alignItems: 'stretch',
            mb: { xs: 3, lg: 3 }
          }}>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              flex: { xs: 'auto', lg: 7 },
              height: { xs: 220, lg: 280 },
              width: '100%'
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              ...rightColumnStyles,
              height: { xs: 220, lg: 280 },
              width: '100%'
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 0, lg: 3 },
            alignItems: 'stretch',
            mb: { xs: 0, lg: 3 }
          }}>
          <Box
            sx={{
              flex: { xs: 'auto', lg: 7 },
              minWidth: 0,
              flexShrink: 1,
              display: 'flex',
              flexDirection: 'column',
              mb: { xs: 3, lg: 0 },
              '& > *': { flexGrow: 1, height: 'auto', mb: 0 }
            }}>
            <SharesTable />
          </Box>

          <Box
            sx={{
              ...rightColumnStyles,
              height: 'auto'
            }}>
            <LiveSharenotes />
          </Box>
        </Box>
      )}

      {enableSkeleton ? (
        <>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 50, width: '100%', marginBottom: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 200, width: '100%', marginBottom: 3 }}
          />
        </>
      ) : (
        <PayoutsChart />
      )}

      {enableSkeleton ? (
        <>
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 50, width: '100%', marginBottom: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ height: 200, width: '100%', marginBottom: 1 }}
          />
        </>
      ) : (
        <PayoutsTable />
      )}
    </Box>
  );
};

export default AddressPage;
