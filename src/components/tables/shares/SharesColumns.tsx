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

const sharesColumns = () => {
  const { t } = useTranslation();
  const settings = useSelector(getSettings);
  const explorerBase = (chainId?: string) => getExplorerBaseUrl(chainId, settings.explorers);
  const formatProfitAmount = (amount: number, chainId?: string) => {
    const meta = getChainMetadata(chainId);
    const decimals = meta?.decimals ?? 8;
    const divisor = 10 ** decimals;
    const symbol = meta?.currencySymbol ?? 'FLC';
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return `0 ${symbol}`;
    const formatted = (numericAmount / divisor).toFixed(6);
    return `${formatted} ${symbol}`;
  };
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
        const chainName = getChainName(params.row?.chainId);
        const chainIcon = getChainIconPath(chainName);
        const chainAvatar = chainIcon ? (
          <Avatar
            alt={`${chainName ?? params.row?.chainId ?? t('liveSharenotes.unknownChain')} logo`}
            src={chainIcon}
            variant="rounded"
            sx={{
              width: 20,
              height: 20
            }}
          />
        ) : undefined;
        const chip = (
          <Chip
            avatar={chainAvatar}
            label={params.value}
            sx={{ fontWeight: 'bold', borderRadius: 1 }}
            size="small"
            component="a"
            target="_blank"
            href={`${explorerBase(params.row.chainId)}/${params.row.blockHash}`}
            clickable
            // color="primary"
            // variant="outlined"
          />
        );

        const tooltipLines: string[] = [];
        if (params.row?.paymentHeight != null) {
          tooltipLines.push(`${t('paymentHeight')}: ${params.row.paymentHeight}`);
        }

        const tooltipTitle =
          tooltipLines.length > 0 ? (
            <>
              {tooltipLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index < tooltipLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </>
          ) : undefined;

        return tooltipTitle ? (
          <Tooltip title={tooltipTitle} placement="top">
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
      headerName: t('profit'),
      field: 'amount',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      renderCell: (params: any) => {
        const chip = (
          <Chip
            label={formatProfitAmount(params.value, params.row?.chainId)}
            sx={{
              fontWeight: 'bold'
            }}
            size="small"
          />
        );

        return chip;
      }
    }
  ];
};

export default sharesColumns;
