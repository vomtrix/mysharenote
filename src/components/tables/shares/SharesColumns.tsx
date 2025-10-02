import { Chip } from '@mui/material';
import { lokiToFlc } from '@utils/Utils';
import dayjs from '@utils/dayjsSetup';
import { fromEpoch } from '@utils/time';
import { useTranslation } from 'react-i18next';
import { EXPLORER_URL } from 'src/config/config';

const sharesColumns = () => {
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
      headerName: t('worker'),
      field: 'workerId',
      flex: 1,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold'
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
      headerName: t('paymentHeight'),
      field: 'paymentHeight',
      flex: 1,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue',
      renderCell: (params: any) => (
        <Chip label={params.value} sx={{ fontWeight: 'bold', borderRadius: 1 }} size="small" />
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
      headerName: t('profit'),
      field: 'amount',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      renderCell: (params: any) => (
        <Chip label={lokiToFlc(params.value)} sx={{ fontWeight: 'bold' }} size="small" />
      )
    }
  ];
};

export default sharesColumns;
