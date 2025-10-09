import CustomTable from '@components/common/CustomTable';
import CustomTooltip from '@components/common/CustomTooltip';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { Chip } from '@mui/material';
import Box from '@mui/material/Box';
import {
  getIsSharesLoading,
  getPendingBalance as getPendingBalance,
  getShares
} from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { useTranslation } from 'react-i18next';
import sharesColumns from './SharesColumns';
import { lokiToFlc } from '@utils/Utils';
import { IS_ADMIN_MODE } from '@config/config';

const SharesTable = () => {
  const { t } = useTranslation();
  const columns = sharesColumns();
  const isLoading = useSelector(getIsSharesLoading);
  const shares = useSelector(getShares);
  const pendingBalance = useSelector(getPendingBalance);

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
            <Box>{t('pendingShares')}</Box>
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
              initialState={{
                sorting: {
                  sortModel: [{ field: 'blockHeight', sort: 'desc' }]
                },
                pagination: { paginationModel: { pageSize: 10 } }
              }}
            />
          </Box>
        )}
      </Box>
    </StyledCard>
  );
};

export default SharesTable;
