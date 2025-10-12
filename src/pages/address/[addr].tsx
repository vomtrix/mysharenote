import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Skeleton } from '@mui/material';
import HashrateChart from '@components/charts/HashrateChart';
import PayoutsTable from '@components/tables/payouts/PayoutsTable';
import SharesTable from '@components/tables/shares/SharesTable';
import { useHasRelayConfig } from '@hooks/useHasRelayConfig';
import { useNotification } from '@hooks/UseNotificationHook';
import { addAddress, clearAddress } from '@store/app/AppReducer';
import { getAddress, getRelayReady, getSettings, getSkeleton } from '@store/app/AppSelectors';
import {
  connectRelay,
  getHashrates,
  getPayouts,
  getShares,
  stopHashrates,
  stopPayouts,
  stopShares
} from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import { validateAddress } from '@utils/Utils';

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
      dispatch(stopHashrates());
      dispatch(stopShares());
      dispatch(stopPayouts());
      dispatch(getHashrates(currentAddress));
      dispatch(getShares(currentAddress));
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
        <SharesTable />
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
