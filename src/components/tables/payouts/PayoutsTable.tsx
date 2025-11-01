import CustomTable from '@components/common/CustomTable';
import CustomTooltip from '@components/common/CustomTooltip';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { Chip } from '@mui/material';
import Box from '@mui/material/Box';
import InfoHeader from '@components/common/InfoHeader';
import { getIsPayoutsLoading, getPayouts, getUnconfirmedBalance } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { lokiToFlc } from '@utils/helpers';
import { useTranslation } from 'react-i18next';
import payoutsColumns from './PayoutsColumns';
import { IS_ADMIN_MODE } from '@config/config';

const PayoutsTable = () => {
  const { t } = useTranslation();
  const columns = payoutsColumns();
  const isLoading = useSelector(getIsPayoutsLoading);
  const payouts = useSelector(getPayouts);
  const unconfirmedBalance = useSelector(getUnconfirmedBalance);

  return (
    <StyledCard>
      <Box
        component="section"
        sx={{
          p: 2,
          minHeight: '200px',
          justifyContent: 'center'
        }}>
        <SectionHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <InfoHeader title={t('payouts')} tooltip={t('info.payouts')} />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
              {unconfirmedBalance > 0 && !isLoading && IS_ADMIN_MODE && (
                <CustomTooltip title={t('unconfirmedBalance')} placement="top" textBold>
                  <Chip
                    label={lokiToFlc(unconfirmedBalance) + ' FLC'}
                    sx={{ fontWeight: 'bold', borderRadius: 1, marginLeft: 1 }}
                    size="small"
                  />
                </CustomTooltip>
              )}
            </Box>
          </Box>
        </SectionHeader>
        {isLoading ? (
          <ProgressLoader value={payouts.length} />
        ) : (
          <CustomTable
            columns={columns}
            rows={payouts}
            initialState={{
              pagination: { paginationModel: { pageSize: 50 } },
              sorting: {
                sortModel: [{ field: 'blockHeight', sort: 'desc' }]
              }
            }}
          />
        )}
      </Box>
    </StyledCard>
  );
};

export default PayoutsTable;
