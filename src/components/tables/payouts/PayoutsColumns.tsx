import dayjs from 'dayjs';
import { Chip } from '@mui/material';
import { lokiToFlc } from '@utils/helpers';
import { fromEpoch } from '@utils/time';
import numeral from 'numeral';
import { useTranslation } from 'react-i18next';
import { EXPLORER_URL } from 'src/config/config';

const payoutsColumns = () => {
  const { t } = useTranslation();
  return [
    {
      headerName: t('time'),
      field: 'timestamp',
      flex: 2,
      minWidth: 150,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      valueFormatter: (value: any) => fromEpoch(value).format('L LT')
    },
    {
      headerName: t('block'),
      field: 'blockHeight',
      flex: 1,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue',
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          sx={{ fontWeight: 'bold', borderRadius: 1 }}
          size="small"
          component="a"
          target="_blank"
          href={`${EXPLORER_URL}/block/${params.row.blockHash}`}
          clickable
        />
      )
    },
    {
      headerName: t('shares'),
      field: 'shares',
      flex: 1,
      minWidth: 90,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold'
    },
    {
      headerName: t('totalShares'),
      field: 'totalShares',
      flex: 2,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold'
    },
    {
      headerName: t('fee'),
      field: 'fee',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      renderCell: (params: any) => {
        const formattedValue = numeral(params.value).format('0,0').replace(/,/g, ' ');
        return <Chip label={formattedValue} sx={{ fontWeight: 'bold' }} size="small" />;
      }
    },
    {
      headerName: t('profit'),
      field: 'amount',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      renderCell: (params: any) => (
        <Chip
          label={lokiToFlc(params.value)}
          color={params.row.confirmedTx ? 'primary' : 'warning'}
          variant="outlined"
          sx={{ fontWeight: 'bold' }}
          size="small"
          component="a"
          target="_blank"
          href={`${EXPLORER_URL}/tx/${params.row.txId}`}
          clickable
        />
      )
    }
  ];
};

export default payoutsColumns;
