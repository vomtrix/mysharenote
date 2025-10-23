import { useTranslation } from 'react-i18next';
import { Chip, Tooltip } from '@mui/material';
import { BlockStatusEnum } from '@objects/interfaces/IShareEvent';
import { fromEpoch } from '@utils/time';
import { lokiToFlc, shareChipColor, shareChipVariant } from '@utils/helpers';
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
      renderCell: (params: any) => {
        const chip = (
          <Chip
            label={params.value}
            sx={{ fontWeight: 'bold', borderRadius: 1 }}
            size="small"
            component="a"
            target="_blank"
            href={`${EXPLORER_URL}/block/${params.row.blockHash}`}
            clickable
            color={shareChipColor(params.row?.status)}
            variant={shareChipVariant(params.row?.status)}
          />
        );
        return [BlockStatusEnum.Orphan, BlockStatusEnum.Checked].includes(params.row?.status) ? (
          <Tooltip
            title={
              params.row?.status == BlockStatusEnum.Orphan ? t('orphanBlock') : t('orphanCheck')
            }
            placement="top">
            {chip}
          </Tooltip>
        ) : (
          chip
        );
      }
    },
    {
      headerName: t('paymentHeight'),
      field: 'paymentHeight',
      flex: 1,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue',
      renderCell: (params: any) => {
        const chip = (
          <Chip
            label={params.value}
            sx={{
              fontWeight: 'bold',
              borderRadius: 1,
              '& .MuiChip-label':
                params.row?.status === BlockStatusEnum.Orphan
                  ? { textDecoration: 'line-through' }
                  : undefined
            }}
            size="small"
            color={shareChipColor(params.row?.status)}
            variant={shareChipVariant(params.row?.status)}
          />
        );

        return [BlockStatusEnum.Orphan, BlockStatusEnum.Checked].includes(params.row?.status) ? (
          <Tooltip
            title={
              params.row?.status == BlockStatusEnum.Orphan ? t('orphanBlock') : t('orphanCheck')
            }
            placement="top">
            {chip}
          </Tooltip>
        ) : (
          chip
        );
      }
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
      renderCell: (params: any) => {
        const chip = (
          <Chip
            label={lokiToFlc(params.value)}
            sx={{
              fontWeight: 'bold',
              '& .MuiChip-label':
                params.row?.status === BlockStatusEnum.Orphan
                  ? { textDecoration: 'line-through' }
                  : undefined
            }}
            color={shareChipColor(params.row?.status)}
            variant={shareChipVariant(params.row?.status)}
            size="small"
          />
        );

        return [BlockStatusEnum.Orphan, BlockStatusEnum.Checked].includes(params.row?.status) ? (
          <Tooltip
            title={
              params.row?.status == BlockStatusEnum.Orphan ? t('orphanBlock') : t('orphanCheck')
            }
            placement="top">
            {chip}
          </Tooltip>
        ) : (
          chip
        );
      }
    }
  ];
};

export default sharesColumns;
