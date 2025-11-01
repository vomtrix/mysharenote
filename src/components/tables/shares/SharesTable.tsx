import { useTranslation } from 'react-i18next';
import { IS_ADMIN_MODE } from '@config/config';
import { Chip } from '@mui/material';
import Box from '@mui/material/Box';
import CustomTable from '@components/common/CustomTable';
import CustomTooltip from '@components/common/CustomTooltip';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import InfoHeader from '@components/common/InfoHeader';
import {
  getIsSharesLoading,
  getPendingBalance as getPendingBalance,
  getShares,
  getSharesSyncLoading
} from '@store/app/AppSelectors';
import { syncBlock } from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import { lokiToFlc } from '@utils/helpers';
import sharesColumns from './SharesColumns';

const SharesTable = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const columns = sharesColumns();
  const isLoading = useSelector(getIsSharesLoading);
  const isSharesSyncLoading = useSelector(getSharesSyncLoading);
  const shares = useSelector(getShares);
  const pendingBalance = useSelector(getPendingBalance);

  const onVisibleShares = async (ids: any[]) => {
    await dispatch(syncBlock(ids));
  };

  return (
    <StyledCard>
      <Box
        component="section"
        sx={{
          p: 2,
          minHeight: shares.length ? 200 : 100,
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
              {pendingBalance > 0 && !isLoading && IS_ADMIN_MODE && (
                <CustomTooltip title={t('pendingBalance')} placement="top" textBold>
                  <Chip
                    label={lokiToFlc(pendingBalance) + ' FLC'}
                    sx={{ fontWeight: 'bold', borderRadius: 1, marginLeft: 1 }}
                    size="small"
                  />
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
                  sortModel: [{ field: 'blockHeight', sort: 'desc' }]
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
