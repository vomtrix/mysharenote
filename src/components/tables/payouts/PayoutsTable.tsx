import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import CustomTable from '@components/common/CustomTable';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { getIsPayoutsLoading, getPayouts } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import payoutsColumns from './PayoutsColumns';

const PayoutsTable = () => {
  const { t } = useTranslation();
  const columns = payoutsColumns();
  const isLoading = useSelector(getIsPayoutsLoading);
  const payouts = useSelector(getPayouts);
  const hasPayouts = payouts.length > 0;
  const sectionMinHeight = isLoading || hasPayouts ? '200px' : 'auto';

  return (
    <StyledCard>
      <Box
        component="section"
        sx={{
          p: 2,
          minHeight: sectionMinHeight,
          justifyContent: 'center'
        }}>
        <SectionHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <InfoHeader title={t('payouts')} tooltip={t('info.payouts')} />
          </Box>
        </SectionHeader>
        {isLoading ? (
          <ProgressLoader value={payouts.length} />
        ) : (
          <CustomTable
            columns={columns}
            rows={payouts}
            filters
            pageSizeOptions={[10]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: {
                sortModel: [{ field: 'timestamp', sort: 'desc' }]
              }
            }}
          />
        )}
      </Box>
    </StyledCard>
  );
};

export default PayoutsTable;
