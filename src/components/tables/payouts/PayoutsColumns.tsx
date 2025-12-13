import numeral from 'numeral';
import { useTranslation } from 'react-i18next';
import {
  getChainIconPath,
  getChainMetadata,
  getChainName,
  getExplorerBaseUrl
} from '@constants/chainIcons';
import { Avatar, Box, Chip, Tooltip } from '@mui/material';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { getSettings } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { fromEpoch } from '@utils/time';

const payoutsColumns = () => {
  const { t } = useTranslation();
  const settings = useSelector(getSettings);
  const explorerBase = (chainId?: string) => getExplorerBaseUrl(chainId, settings.explorers);
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
  const formatPayoutAmount = (amount: number, chainId?: string) => {
    const resolvedChain = chainId ?? 'flokicoin';
    const meta = getChainMetadata(resolvedChain);
    const decimals = meta?.decimals ?? 8;
    const divisor = 10 ** decimals;
    const symbol = meta?.currencySymbol ?? 'FLC';
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return `0 ${symbol}`;
    const formatted = (numericAmount / divisor).toFixed(6);
    return `${formatted} ${symbol}`;
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
      renderCell: (params: any) => {
        const chainId = params.row?.chainId ?? 'flokicoin';
        const chainName = getChainName(chainId) ?? chainId;
        const chainIcon = getChainIconPath(chainId);
        const chainAvatar = chainIcon ? (
          <Avatar
            alt={`${chainName ?? t('liveSharenotes.unknownChain')} logo`}
            src={chainIcon}
            variant="rounded"
            sx={{ width: 20, height: 20 }}
          />
        ) : undefined;
        return (
          <Chip
            avatar={chainAvatar}
            label={params.value}
            sx={{ fontWeight: 'bold', borderRadius: 1 }}
            size="small"
            component="a"
            target="_blank"
            href={`${explorerBase(chainId)}/${params.row.blockHash}`}
            clickable
          />
        );
      }
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
      headerName: t('shares'),
      field: 'shares',
      flex: 1,
      minWidth: 90,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      renderCell: (params: any) => renderSharenoteCell(params.value, params.row?.sharesCount)
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
      headerName: t('amount'),
      field: 'amount',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      renderCell: (params: any) => {
        const label = formatPayoutAmount(params.value, params.row?.chainId);
        return (
          <Chip
            label={label}
            color={params.row.confirmedTx ? 'primary' : 'warning'}
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
            size="small"
            component="a"
            target="_blank"
            href={`${explorerBase(params.row?.chainId)}/tx/${params.row.txId}`}
            clickable
          />
        );
      }
    }
  ];
};

export default payoutsColumns;
