import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
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
import {
  getAddress,
  getHashrates as selectHashrates,
  getIsHashratesLoading,
  getIsLiveSharenotesLoading,
  getIsPayoutsLoading,
  getIsSharesLoading,
  getLiveSharenotes as selectLiveSharenotes,
  getPayouts as selectPayouts,
  getRelayReady,
  getSettings,
  getShares as selectShares,
  getSkeleton
} from '@store/app/AppSelectors';
import {
  connectRelay,
  getHashrates,
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
  const hashrates = useSelector(selectHashrates);
  const shares = useSelector(selectShares);
  const payouts = useSelector(selectPayouts);
  const liveSharenotes = useSelector(selectLiveSharenotes);
  const isHashratesLoading = useSelector(getIsHashratesLoading);
  const isSharesLoading = useSelector(getIsSharesLoading);
  const isPayoutsLoading = useSelector(getIsPayoutsLoading);
  const isLiveSharenotesLoading = useSelector(getIsLiveSharenotesLoading);
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
  const sectionMaxHeights = {
    hashrateLg: 420,
    liveSharenotesLg: 420
  };
  const gridGapLgPx = 24; // theme.spacing(3)
  const workersInsightsMaxHeightLg =
    sectionMaxHeights.hashrateLg + sectionMaxHeights.liveSharenotesLg + gridGapLgPx;
  const cardHeights = {
    tall: { xs: rowHeights.xs, lg: rowHeights.lgTall },
    medium: { xs: rowHeights.xs, lg: rowHeights.lgMedium },
    short: { xs: rowHeights.xs - 20, lg: rowHeights.lgShort }
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
  const getSectionWrapper = (shouldStretch: boolean) => ({
    display: 'flex',
    '& > *': {
      flexGrow: 1,
      width: '100%',
      height: shouldStretch ? '100%' : 'auto'
    }
  });
  const hasHashrateContent = isHashratesLoading || (hashrates?.length ?? 0) > 0;
  const hasShareContent = isSharesLoading || (shares?.length ?? 0) > 0;
  const hasPayoutContent = isPayoutsLoading || (payouts?.length ?? 0) > 0;
  const hasLiveSharenoteContent = isLiveSharenotesLoading || (liveSharenotes?.length ?? 0) > 0;

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
              height: cardHeights.tall
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '1 / span 2' },
              height: {
                xs: cardHeights.tall.xs,
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
              height: cardHeights.tall
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '3' },
              height: cardHeights.medium
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '3' },
              height: cardHeights.medium
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '4' },
              height: cardHeights.short
            }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '4' },
              height: cardHeights.short
            }}
          />
        </Box>
      ) : (
        <Box sx={cardGridStyles}>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '1' },
              minHeight: hasHashrateContent ? cardHeights.tall : 'auto',
              maxHeight: { xs: 'none', lg: sectionMaxHeights.hashrateLg },
              overflow: { xs: 'visible', lg: 'hidden' },
              ...getSectionWrapper(hasHashrateContent)
            }}>
            <HashrateChart />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '1 / span 2' },
              maxHeight: { xs: 'none', lg: workersInsightsMaxHeightLg },
              overflow: { xs: 'visible', lg: 'hidden' },
              ...getSectionWrapper(hasHashrateContent)
            }}>
            <WorkersInsights />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '2' },
              minHeight: hasLiveSharenoteContent ? cardHeights.medium : 'auto',
              maxHeight: { xs: 'none', lg: sectionMaxHeights.liveSharenotesLg },
              overflow: { xs: 'visible', lg: 'hidden' },
              ...getSectionWrapper(hasLiveSharenoteContent)
            }}>
            <LiveSharenotes />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '3' },
              ...getSectionWrapper(hasShareContent)
            }}>
            <SharesTable />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '3' },
              minHeight: hasShareContent ? cardHeights.tall : 'auto',
              ...getSectionWrapper(hasShareContent)
            }}>
            <WorkersProfit />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '1' },
              gridRow: { xs: 'auto', lg: '4' },
              ...getSectionWrapper(hasPayoutContent)
            }}>
            <PayoutsTable />
          </Box>
          <Box
            sx={{
              gridColumn: { xs: '1', lg: '2' },
              gridRow: { xs: 'auto', lg: '4' },
              ...getSectionWrapper(hasPayoutContent)
            }}>
            <PayoutsChart />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AddressPage;
