import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getChainIconPath, getChainName } from '@constants/chainIcons';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import CustomTable from '@components/common/CustomTable';
import CustomTooltip from '@components/common/CustomTooltip';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import { getIsSharesLoading, getShares } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { formatFlcCurrency } from '@utils/helpers';
import sharesColumns from './SharesColumns';

const SharesTable = () => {
  const { t } = useTranslation();
  const columns = sharesColumns();
  const isLoading = useSelector(getIsSharesLoading);
  const shares = useSelector(getShares);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const hasShares = shares.length > 0;
  const sectionMinHeight = isLoading || hasShares ? '200px' : 'auto';

  const pendingByChain = useMemo(() => {
    const totals = new Map<
      string,
      { amount: number; chainLabel: string; chainId?: string; icon?: string }
    >();

    shares.forEach((share) => {
      if (!share) return;
      const amount = Number(share.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const chainLabel =
        getChainName(share.chainId) ?? share.chainId ?? t('liveSharenotes.unknownChain');
      const chainKey = (chainLabel || 'unknown').toLowerCase();
      const existing = totals.get(chainKey);
      const icon = getChainIconPath(share.chainId ?? chainLabel);

      totals.set(chainKey, {
        amount: (existing?.amount ?? 0) + amount,
        chainLabel,
        chainId: share.chainId,
        icon: icon ?? existing?.icon
      });
    });

    return Array.from(totals.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.amount - a.amount);
  }, [shares, t]);

  const primaryPending = pendingByChain[0];
  const secondaryPending = pendingByChain.slice(1);

  const formatPendingAmount = (amount: number) =>
    formatFlcCurrency(amount, { includeSymbol: false, maximumFractionDigits: 4 });

  const handleToggleDropdown = () => {
    if (!secondaryPending.length) return;
    setIsDropdownOpen((prev) => !prev);
  };

  const dropdownItems = primaryPending ? [primaryPending, ...secondaryPending] : secondaryPending;

  const renderBadge = (item: (typeof pendingByChain)[number]) => (
    <Badge
      key={item.key}
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        <Typography
          variant="caption"
          component="span"
          fontWeight={700}
          sx={{
            px: 0.35,
            fontSize: { xs: 11, sm: 12 },
            maxWidth: { xs: 76, sm: 92 },
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          noWrap>
          {formatPendingAmount(item.amount)}
        </Typography>
      }
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        '& .MuiBadge-badge': {
          position: 'static',
          transform: 'none',
          mt: 0.25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 999,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          minWidth: 'auto',
          height: 'auto',
          lineHeight: 1.2,
          boxShadow: 2,
          maxWidth: '100%',
          px: 0.75,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.15
        }
      }}>
      <Avatar
        alt={item.chainLabel}
        src={item.icon}
        variant="square"
        sx={{
          width: { xs: 28, sm: 32 },
          height: { xs: 28, sm: 32 },
          fontSize: { xs: 11, sm: 13 },
          bgcolor: 'transparent',
          borderRadius: 0
        }}>
        {!item.icon && item.chainLabel?.[0]?.toUpperCase()}
      </Avatar>
    </Badge>
  );

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
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="nowrap"
            gap={1}
            textAlign="left"
            width="100%"
            minWidth={0}>
            <Box sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <InfoHeader title={t('pendingShares')} tooltip={t('info.pendingShares')} />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
                minWidth: 0
              }}>
              {primaryPending && !isLoading && (
                <ClickAwayListener
                  onClickAway={() => {
                    if (isDropdownOpen) {
                      setIsDropdownOpen(false);
                    }
                  }}>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      width: 'auto',
                      ml: 'auto',
                      flexShrink: 0
                    }}>
                    <Box
                      role={secondaryPending.length ? 'button' : undefined}
                      tabIndex={secondaryPending.length ? 0 : -1}
                      onClick={handleToggleDropdown}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleToggleDropdown();
                        }
                      }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 12,
                        cursor: secondaryPending.length ? 'pointer' : 'default',
                        transition: 'transform 0.2s ease, filter 0.25s ease',
                        '&:hover': secondaryPending.length
                          ? {
                              transform: 'translateY(-1px)',
                              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.18))'
                            }
                          : undefined
                      }}>
                      {renderBadge(primaryPending)}
                      {secondaryPending.length > 0 && (
                        <Box
                          component="svg"
                          viewBox="0 0 20 20"
                          aria-hidden
                          focusable="false"
                          sx={{
                            width: 18,
                            height: 18,
                            opacity: 0.8,
                            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}>
                          <path
                            d="M5.25 7.5 10 12.25 14.75 7.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Box>
                      )}
                    </Box>
                    {secondaryPending.length > 0 && (
                      <Collapse
                        in={isDropdownOpen}
                        timeout={220}
                        unmountOnExit
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 'auto',
                          transform: 'none',
                          display: 'flex',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          width: 'auto',
                          zIndex: 10
                        }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 1,
                            borderRadius: 14,
                            boxShadow: '0 16px 40px rgba(0,0,0,0.24)',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            backdropFilter: 'blur(10px)',
                            width: { xs: 'min(420px, 100%)', sm: 'fit-content' }
                          }}>
                          {dropdownItems.map((item, index) => (
                            <Box
                              key={`${item.key}-${index === 0 ? 'primary' : 'secondary'}`}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 10,
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
                                transition:
                                  'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
                                '&:hover': {
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
                                  backgroundColor: 'rgba(0,0,0,0.05)'
                                }
                              }}>
                              {renderBadge(item)}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                </ClickAwayListener>
              )}
            </Box>
          </Box>
        </SectionHeader>
        {isLoading ? (
          <ProgressLoader value={shares.length} />
        ) : (
            <CustomTable
              columns={columns}
              rows={shares}
              filters
              pageSizeOptions={[10]}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'timestamp', sort: 'desc' }]
                },
                pagination: { paginationModel: { pageSize: 10 } }
              }}
            />
        )}
      </Box>
    </StyledCard>
  );
};

export default SharesTable;
