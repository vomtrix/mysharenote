import { useTranslation } from 'react-i18next';
import {
  getChainIconPath,
  getChainMetadata,
  getChainName,
  getExplorerBaseUrl
} from '@constants/chainIcons';
import { getGridNumericOperators, getGridStringOperators } from '@mui/x-data-grid';
import { Avatar, Box, Chip, IconButton, Tooltip } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { getSettings } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { formatSharenoteLabel } from '@utils/helpers';
import { fromEpoch } from '@utils/time';

const sharesColumns = () => {
  const { t } = useTranslation();
  const settings = useSelector(getSettings);
  const explorerBase = (chainId?: string) => getExplorerBaseUrl(chainId, settings.explorers);
  const equalsNumberOperator = (() => {
    const numericOps = getGridNumericOperators();
    const equalsOp = numericOps.find((op) => op.value === 'equals');
    return equalsOp ? [equalsOp] : numericOps.slice(0, 1);
  })();
  const workerStringOperators = (() => {
    const stringOps = getGridStringOperators();
    const containsOp = stringOps.find((op) => op.value === 'contains');
    if (!containsOp) return stringOps;
    const remaining = stringOps.filter((op) => op.value !== 'contains');
    return [containsOp, ...remaining];
  })();
  const containsStringOperator = (() => {
    const stringOps = getGridStringOperators();
    const containsOp = stringOps.find((op) => op.value === 'contains');
    return containsOp ? [containsOp] : stringOps.slice(0, 1);
  })();
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
    const formattedLabel = formatSharenoteLabel(value);

    const content = (
      <Box display="flex" alignItems="center" gap={0.5}>
        {formattedLabel ? (
          <Box
            component="span"
            sx={{
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'action.selected',
              color: 'text.secondary',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2
            }}>
            <ShareNoteLabel value={value} />
          </Box>
        ) : null}
        {hasCount ? (
          <Box component="span" sx={{ fontWeight: 700, fontSize: 13 }}>
            {parsedCount}
          </Box>
        ) : null}
      </Box>
    );

    return content;
  };

  const renderColumnHeader = (title: string, tooltip: string) => (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Tooltip
        title={tooltip}
        slotProps={{ tooltip: { sx: { maxWidth: 320 } } }}
        placement="top"
        arrow>
        <IconButton
          size="small"
          sx={{ color: (theme) => theme.palette.text.secondary, p: 0.25, ml: -0.5 }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box>{title}</Box>
    </Box>
  );
  return [
    {
      headerName: t('time'),
      field: 'timestamp',
      flex: 1.2,
      minWidth: 160,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      valueFormatter: (value: any) => fromEpoch(value).format('L LT'),
      filterable: false,
      disableColumnMenu: true
    },
    {
      headerName: t('worker'),
      field: 'workerId',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      filterOperators: workerStringOperators
    },
    {
      headerName: t('block'),
      field: 'blockHeight',
      flex: 1,
      minWidth: 120,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue',
      filterOperators: equalsNumberOperator,
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
            href={`${explorerBase(params.row.chainId)}/block/${params.row.blockHash}`}
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
      headerName: 'Worker Notes',
      renderHeader: () =>
        renderColumnHeader(
          'Worker Notes',
          'Sharenotes printed by this worker during and before solving this block.'
        ),
      field: 'shares',
      flex: 1.1,
      minWidth: 140,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => renderSharenoteCell(params.value, params.row?.sharesCount)
    },
    {
      headerName: 'Total Notes',
      renderHeader: () =>
        renderColumnHeader(
          'Total Notes',
          'All sharenotes submitted by every miner during and before solving this block.'
        ),
      field: 'totalShares',
      flex: 1.1,
      minWidth: 140,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-bold',
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => renderSharenoteCell(params.value, params.row?.totalSharesCount)
    },
    {
      headerName: 'Reward',
      field: 'amount',
      flex: 1,
      minWidth: 130,
      headerClassName: 'text-blue text-uppercase',
      cellClassName: 'text-blue text-bold',
      filterable: false,
      disableColumnMenu: true,
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
