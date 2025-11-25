import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainIconPath, getChainName } from '@constants/chainIcons';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CustomTable from '@components/common/CustomTable';
import CustomTooltip from '@components/common/CustomTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { BlockStatusEnum } from '@objects/interfaces/IShareEvent';
import { getIsSharesLoading, getShares, getSharesSyncLoading } from '@store/app/AppSelectors';
import { syncBlock } from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import { formatFlcCurrency } from '@utils/helpers';
import sharesColumns from './SharesColumns';

const SharesTable = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const columns = sharesColumns();
  const isLoading = useSelector(getIsSharesLoading);
  const isSharesSyncLoading = useSelector(getSharesSyncLoading);
  const shares = useSelector(getShares);

  const pendingByChain = useMemo(() => {
    const totals = new Map<
      string,
      { amount: number; chainLabel: string; chainId?: string; icon?: string }
    >();

    shares.forEach((share) => {
      if (!share || share.status === BlockStatusEnum.Orphan) return;
      const amount = Number(share.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const chainLabel =
        getChainName(share.chainId) ?? share.chainId ?? t('liveSharenotes.unknownChain');
      const chainKey = (chainLabel || 'unknown').toLowerCase();
      const existing = totals.get(chainKey);
      const icon = getChainIconPath(share.chainId ?? chainLabel);

      totals.set(chainKey, {
        amount: (existing?.amount ?? 0) + amount,
        chainLabel,
        chainId: share.chainId,
        icon: icon ?? existing?.icon
      });
    });

    return Array.from(totals.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.amount - a.amount);
  }, [shares, t]);

  const formatPendingAmount = (amount: number) =>
    formatFlcCurrency(amount, { includeSymbol: false, maximumFractionDigits: 6 });

  const onVisibleShares = async (ids: any[]) => {
    await dispatch(syncBlock(ids));
  };

  return (
    <StyledCard>
      <Box
        component="section"
        sx={{
          p: 2,
          justifyContent: 'center'
        }}>
        <SectionHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <InfoHeader title={t('pendingShares')} tooltip={t('info.pendingShares')} />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
              {pendingByChain.length > 0 && !isLoading && (
                <CustomTooltip title={t('pendingBalanceTooltip')} placement="top" textBold>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: { xs: 'nowrap', sm: 'wrap' },
                      overflowX: { xs: 'auto', sm: 'visible' },
                      gap: 1,
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                      alignItems: 'center',
                      maxWidth: '100%',
                      py: 0.5,
                      px: 0.5
                    }}>
                    {pendingByChain.map((item) => (
                      <Chip
                        key={item.key}
                        avatar={
                          item.icon ? (
                            <Avatar
                              alt={`${item.chainLabel} logo`}
                              src={item.icon}
                              variant="rounded"
                              sx={{ width: 24, height: 24 }}
                            />
                          ) : undefined
                        }
                        label={
                          <Typography
                            variant="body2"
                            component="span"
                            color="text.secondary"
                            fontWeight={700}
                            noWrap>
                            {formatPendingAmount(item.amount)}
                          </Typography>
                        }
                        variant="outlined"
                        sx={{
                          borderRadius: 1.5,
                          minWidth: 90,
                          height: 34,
                          borderColor: 'divider',
                          '& .MuiChip-label': { width: '100%' }
                        }}
                      />
                    ))}
                  </Box>
                </CustomTooltip>
              )}
            </Box>
          </Box>
        </SectionHeader>
        {isLoading ? (
          <ProgressLoader value={shares.length} />
        ) : (
          <Box sx={{ height: shares.length ? 'auto' : 100 }}>
            <CustomTable
              columns={columns}
              rows={shares}
              pageSizeOptions={[10]}
              isLoading={isSharesSyncLoading}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'timestamp', sort: 'desc' }]
                },
                pagination: { paginationModel: { pageSize: 10 } }
              }}
              onVisibleRowChange={onVisibleShares}
            />
          </Box>
        )}
      </Box>
    </StyledCard>
  );
};

export default SharesTable;
