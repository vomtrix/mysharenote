import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import {
  combineNotesSerial,
  noteFromZBits,
  parseNoteLabel,
  Sharenote
} from '@soprinter/sharenotejs';
import InfoHeader from '@components/common/InfoHeader';
import ProgressLoader from '@components/common/ProgressLoader';
import ShareNoteLabel from '@components/common/ShareNoteLabel';
import { SectionHeader } from '@components/styled/SectionHeader';
import { StyledCard } from '@components/styled/StyledCard';
import type { ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { getIsLiveSharenotesLoading, getLiveSharenotes } from '@store/app/AppSelectors';
import { useSelector } from '@store/store';
import { formatRelativeFromTimestamp } from '@utils/time';

const toSharenote = (event: ILiveSharenoteEvent): Sharenote | undefined => {
  if (typeof event.zBits === 'number' && Number.isFinite(event.zBits)) {
    try {
      return noteFromZBits(event.zBits);
    } catch {
      // ignore invalid conversions
    }
  }

  const labelCandidate = event.sharenote?.toString() ?? event.zLabel;
  if (labelCandidate && labelCandidate.trim().length > 0) {
    try {
      return parseNoteLabel(labelCandidate.trim());
    } catch {
      // ignore parsing failures
    }
  }

  return undefined;
};

const formatSince = (value?: number) => {
  const formatted = formatRelativeFromTimestamp(value);
  if (formatted === '--') return formatted;
  return `Since ${formatted.replace(/ ago$/, '')}`;
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '--';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const LiveSharenotes = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const liveSharenotes = useSelector(getLiveSharenotes);
  const isLoading = useSelector(getIsLiveSharenotesLoading);

  const visibleSharenotes = useMemo(
    () => [...liveSharenotes].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [liveSharenotes]
  );

  const latestBlock = useMemo(
    () => visibleSharenotes.find((note) => typeof note.blockHeight === 'number')?.blockHeight,
    [visibleSharenotes]
  );

  const latestBlockEvents = useMemo(
    () =>
      visibleSharenotes.filter(
        (note) => note.blockHeight === latestBlock && latestBlock !== undefined
      ),
    [visibleSharenotes, latestBlock]
  );

  const blockNotes = useMemo(
    () =>
      latestBlockEvents.map(toSharenote).filter((note): note is Sharenote => note !== undefined),
    [latestBlockEvents]
  );

  const blockSumLabel = blockNotes.length > 0 ? combineNotesSerial(blockNotes).label : undefined;

  const sortedBlockEvents = useMemo(
    () => [...latestBlockEvents].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [latestBlockEvents]
  );

  const summaryText = [
    `block #${typeof latestBlock === 'number' ? latestBlock : '-'}`,
    `${sortedBlockEvents.length} sharenotes`,
    `sum ${blockSumLabel ?? '--'}`
  ].join(' - ');

  const metaTypographySx = {
    fontFamily: theme.typography.fontFamily,
    fontSize: { xs: '0.65rem', sm: '0.75rem' }
  };
  const noteCardBackground =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.08)
      : alpha(theme.palette.primary.main, 0.04);
  const noteCardBorder = alpha(theme.palette.primary.main, 0.4);

  return (
    <StyledCard
      sx={{
        height: { xs: 'auto', lg: 320 },
        mb: { xs: 3, lg: 0 }
      }}>
      <Box
        component="section"
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
        <SectionHeader
          sx={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 0.5
          }}>
          <InfoHeader title={t('liveSharenotes')} tooltip={t('info.liveSharenotes')} />
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem'
            }}>
            {summaryText}
          </Typography>
        </SectionHeader>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
          {isLoading ? (
            <ProgressLoader value={sortedBlockEvents.length} />
          ) : sortedBlockEvents.length === 0 ? (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                minHeight: 0,
                flexGrow: 1
              }}>
              {t('liveSharenotes.empty')}
            </Box>
          ) : (
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                minHeight: 0,
                pb: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5
              }}>
              {sortedBlockEvents.map((note) => {
                const sharenoteValue = note.sharenote ?? note.zLabel ?? note.id;
                return (
                  <Box
                    key={note.id}
                    sx={{
                      borderRadius: 2,
                      p: { xs: 1.5, sm: 2 },
                      border: `1px solid ${noteCardBorder}`,
                      backgroundColor: noteCardBackground,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 1
                      }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.2,
                          fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1rem' },
                          color: theme.palette.text.primary,
                          fontFamily: theme.typography.fontFamily
                        }}>
                        <ShareNoteLabel value={sharenoteValue} placeholder="--" />
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          whiteSpace: 'nowrap',
                          fontFamily: theme.typography.fontFamily
                        }}>
                        {formatSince(note.timestamp)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        color: theme.palette.text.secondary
                      }}>
                      <Typography variant="caption" sx={metaTypographySx}>
                        {note.worker ?? note.workerId ?? t('worker')}
                      </Typography>
                      <Box component="span" sx={{ color: theme.palette.text.secondary }}>
                        •
                      </Box>
                      <Typography variant="caption" sx={metaTypographySx}>
                        {`${formatNumber(note.zBits)} zBits`}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </StyledCard>
  );
};

export default LiveSharenotes;
