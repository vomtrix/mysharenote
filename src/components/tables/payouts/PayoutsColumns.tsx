import numeral from 'numeral';
import { useTranslation } from 'react-i18next';
import { EXPLORER_URL } from 'src/config/config';
import { Box, Chip, Tooltip } from '@mui/material';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { lokiToFlc } from '@utils/helpers';
import { fromEpoch } from '@utils/time';

const payoutsColumns = () => {
  const { t } = useTranslation();
  const renderSharenoteCell = (value: any, count?: number) => {
    const parsedCount = Number(count);
    const hasCount = Number.isFinite(parsedCount);
    const tooltipTitleParts: string[] = [];
    if (value !== undefined && value !== null && value !== '') {
      tooltipTitleParts.push(t('liveSharenotes.sum', { label: value }));
    }
    if (hasCount) {
      tooltipTitleParts.push(t('liveSharenotes.count', { count: parsedCount }));
    }
    const tooltipTitle = tooltipTitleParts.join(' • ');

    const content = (
      <Box display="flex" alignItems="center" gap={0.5}>
        <ShareNoteLabel value={value} />
        {hasCount ? (
          <Box
            component="span"
            sx={{
              ml: 0.25,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'action.selected',
              color: 'text.secondary',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2
            }}>
            ×{parsedCount}
          </Box>
        ) : null}
      </Box>
    );

    return tooltipTitle ? (
      <Tooltip title={tooltipTitle} placement="top">
        {content}
      </Tooltip>
    ) : (
      content
    );
  };
  return [
    {
      headerName: t('time'),
      field: 'timestamp',
      flex: 1,
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
      cellClassName: 'text-bold',
      renderCell: (params: any) => renderSharenoteCell(params.value, params.row?.sharesCount)
    },
    {
      headerName: t('totalShares'),
      field: 'totalShares',
      flex: 1,
      minWidth: 100,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      renderCell: (params: any) => renderSharenoteCell(params.value, params.row?.totalSharesCount)
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
