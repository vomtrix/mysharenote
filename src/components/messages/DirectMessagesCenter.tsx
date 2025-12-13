import {
  type ReactElement,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { alpha as muiAlpha, useTheme } from '@mui/material/styles';
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  LinearProgress,
  Tooltip
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from '@store/store';
import {
  getAddress,
  getDirectMessages,
  getDirectMessagesLastOpenedAt,
  getIsDirectMessagesLoading,
  getRelayReady
} from '@store/app/AppSelectors';
import { getDirectMessages as fetchDirectMessages, stopDirectMessages } from '@store/app/AppThunks';
import { IDirectMessageEvent } from '@objects/interfaces/IDirectMessageEvent';
import { setDirectMessagesLastOpened } from '@store/app/AppReducer';
import { formatRelativeFromTimestamp } from '@utils/time';
import {
  AdmonitionDirectiveDescriptor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin
} from '@mdxeditor/editor';

const MAX_PREVIEW_LENGTH = 140;
const MarkdownViewer = dynamic(() => import('@mdxeditor/editor').then((mod) => mod.MDXEditor), {
  ssr: false
});

const SlideDown = forwardRef(function SlideDown(
  props: TransitionProps & { children: ReactElement<any, any> },
  ref
) {
  return <Slide {...props} ref={ref} direction="down" />;
});

const decodeHtmlEntities = (input: string) =>
  input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const normalizePreviewText = (text: string) =>
  decodeHtmlEntities(text)
    .replace(/^message\d*\s*:/i, '')
    .replace(/\\n/g, ' ')
    .replace(/^\s*:::+[^\n]*$/gm, ' ') // drop admonition fences like :::tip
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripNonAscii = (text: string) => text.replace(/[^\x20-\x7E]+/g, '').trim();

const extractTitle = (text: string) => {
  const clean = stripNonAscii(normalizePreviewText(text));
  if (!clean) return 'New message';
  const firstLine = clean.split(/\n/).find((line) => line.trim()) ?? clean;
  const firstSentence = firstLine.split(/(?<=[.!?])\s+/)[0] ?? firstLine;
  const asciiTitle = stripNonAscii(firstSentence) || 'New message';
  return asciiTitle.slice(0, 100) || 'New message';
};

const hasAlertTag = (tags: string[][]) =>
  Array.isArray(tags) && tags.some((tag) => tag?.[0] === 'alert' && tag?.[1] === '1');

const DM_LAST_OPENED_STORAGE_KEY = 'dm_last_opened';

interface DirectMessagesCenterProps {
  iconSize?: 'small' | 'medium';
}

const DirectMessagesCenter = ({ iconSize = 'medium' }: DirectMessagesCenterProps) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const directMessages = useSelector(getDirectMessages);
  const lastOpenedAt = useSelector(getDirectMessagesLastOpenedAt);
  const address = useSelector(getAddress);
  const isLoading = useSelector(getIsDirectMessagesLoading);
  const relayReady = useSelector(getRelayReady);
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<IDirectMessageEvent | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [unreadDividerMessageId, setUnreadDividerMessageId] = useState<string | null>(null);
  const seenAlertsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const prevMessageIdsSignatureRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(DM_LAST_OPENED_STORAGE_KEY);
    if (!raw) return;
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      dispatch(setDirectMessagesLastOpened(parsed));
    }
  }, [dispatch]);

  const relevantMessages = useMemo(() => {
    if (!directMessages.length) return [];
    if (address) return directMessages.filter((msg) => msg.address === address);
    return directMessages;
  }, [address, directMessages]);

  const sortedMessages = useMemo(
    () =>
      relevantMessages
        .slice()
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)),
    [relevantMessages]
  );

  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; items: IDirectMessageEvent[] }> = [];
    sortedMessages.forEach((msg) => {
      const tsMs = (msg.created_at ?? 0) * 1000 || Date.now();
      const dateKey = dayjs(tsMs).format('YYYY-MM-DD');
      const label = dayjs(tsMs).format('MMM D, YYYY');
      const current = groups[groups.length - 1];
      if (!current || current.dateKey !== dateKey) {
        groups.push({ dateKey, label, items: [msg] });
      } else {
        current.items.push(msg);
      }
    });
    return groups;
  }, [sortedMessages]);
  const messageIdsSignature = useMemo(
    () => relevantMessages.map((m) => m.id).join('|'),
    [relevantMessages]
  );
  const lastMessageId = useMemo(
    () => relevantMessages[relevantMessages.length - 1]?.id,
    [relevantMessages]
  );

  const scrollToBottom = useCallback(() => {
    const node = messagesRef.current;
    if (!node) return;
    const doScroll = () => {
      const target = noticeRef.current || lastMessageRef.current;
      if (target) {
        target.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    };
    const attempt = (remaining: number) => {
      requestAnimationFrame(() => {
        doScroll();
        if (remaining > 0) attempt(remaining - 1);
      });
    };
    attempt(3); // a few frames to ensure DOM paint before scrolling
  }, []);

  const handleDialogEntered: TransitionProps['onEntered'] = () => {
    scrollToBottom();
  };

  const effectiveLastOpened = useMemo(() => {
    if (typeof lastOpenedAt === 'number' && Number.isFinite(lastOpenedAt)) return lastOpenedAt;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(DM_LAST_OPENED_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }, [lastOpenedAt]);

  const hasUnreadBaseline = typeof effectiveLastOpened === 'number' && Number.isFinite(effectiveLastOpened);

  const hasMessages = relevantMessages.length > 0;

  useEffect(() => {
    if (!address || !hasMessages) return;
    const nextAlert = relevantMessages.find(
      (msg) => hasAlertTag(msg.tags) && !seenAlertsRef.current.has(msg.id)
    );
    if (nextAlert) {
      seenAlertsRef.current.add(nextAlert.id);
      setAlertMessage(nextAlert);
    }
  }, [address, hasMessages, relevantMessages]);

  const handleCloseAlert = () => setAlertMessage(null);

  const unreadCount = useMemo(() => {
    if (open) return 0;
    if (!relevantMessages.length) return 0;
    if (!effectiveLastOpened) return relevantMessages.length;
    return relevantMessages.filter((msg) => (msg.created_at ?? 0) > effectiveLastOpened).length;
  }, [effectiveLastOpened, open, relevantMessages]);

  const accentBorder = muiAlpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.2);
  const codeBlockLanguages = useMemo(
    () => ({
      txt: 'Plain text',
      js: 'JavaScript',
      ts: 'TypeScript',
      json: 'JSON',
      bash: 'Bash',
      md: 'Markdown'
    }),
    []
  );
  const viewerPlugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
      codeMirrorPlugin({ codeBlockLanguages }),
      tablePlugin(),
      thematicBreakPlugin()
    ],
    [codeBlockLanguages]
  );

  const updateLastOpened = useCallback((timestampSeconds?: number) => {
    const ts = Number.isFinite(timestampSeconds) ? Math.floor(timestampSeconds as number) : null;
    const value = ts ?? Math.floor(Date.now() / 1000);
    dispatch(setDirectMessagesLastOpened(value));
    if (typeof window !== 'undefined') {
      localStorage.setItem(DM_LAST_OPENED_STORAGE_KEY, String(value));
    }
  }, [dispatch]);

  const handleOpenInbox = () => {
    const firstUnread = hasUnreadBaseline
      ? sortedMessages.find((msg) => (msg.created_at ?? 0) > (effectiveLastOpened as number))
      : null;
    setUnreadDividerMessageId(firstUnread?.id ?? null);
    updateLastOpened();
    setOpen(true);
  };

  useEffect(() => {
    if (open) {
      updateLastOpened();
    }
  }, [open, updateLastOpened]);

  useEffect(() => {
    if (!open) return;
    if (lastMessageId) {
      lastSeenMessageIdRef.current = lastMessageId;
    }
    if (hasMessages) {
      updateLastOpened();
    }
  }, [hasMessages, lastMessageId, messageIdsSignature, open, updateLastOpened]);

  useEffect(() => {
    if (!lastMessageId || !open) return;
    const previousId = lastSeenMessageIdRef.current;
    const isNewMessage = Boolean(previousId && previousId !== lastMessageId);
    lastSeenMessageIdRef.current = lastMessageId;

    updateLastOpened();

    if (!isNewMessage) return;
    setUnreadDividerMessageId(null);
    setHighlightedMessageId(lastMessageId);
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [lastMessageId, open, relevantMessages, updateLastOpened]);

  useEffect(() => {
    if (!open) {
      prevMessageIdsSignatureRef.current = messageIdsSignature;
      return;
    }
    const hadSignature = Boolean(prevMessageIdsSignatureRef.current);
    const signatureChanged = prevMessageIdsSignatureRef.current !== messageIdsSignature;
    if (hadSignature && signatureChanged && unreadDividerMessageId) {
      setUnreadDividerMessageId(null);
    }
    prevMessageIdsSignatureRef.current = messageIdsSignature;
  }, [messageIdsSignature, open, unreadDividerMessageId]);

  useEffect(() => {
    if (!address || !relayReady) return;
    dispatch(fetchDirectMessages(address));
    return () => {
      dispatch(stopDirectMessages());
    };
  }, [address, relayReady, dispatch]);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [groupedMessages.length, messageIdsSignature, lastMessageId, open, scrollToBottom]);

  const renderMessageBody = (message: IDirectMessageEvent) => (
    <MarkdownViewer
      key={message.id}
      markdown={message.content || ''}
      readOnly
      plugins={viewerPlugins}
      contentEditableClassName="mdxeditor-root-contenteditable"
    />
  );

  const UnreadDivider = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        my: { xs: 0.6, md: 0.75 },
        mx: { xs: 0.25, md: 0.75 },
        color: theme.palette.error.main
      }}>
      <Box
        sx={{
          flex: 1,
          height: 1.5,
          backgroundColor: muiAlpha(theme.palette.error.main, 0.28),
          borderRadius: 999
        }}
      />
      <Box
        sx={{
          px: 1.25,
          py: 0.3,
          borderRadius: 999,
          border: `1px solid ${muiAlpha(theme.palette.error.main, 0.55)}`,
          backgroundColor: muiAlpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.18 : 0.14),
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 6px 18px -10px rgba(0,0,0,0.65)'
              : '0 8px 20px -12px rgba(200,60,60,0.35)'
        }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontSize: '0.72rem'
          }}>
          Unread messages
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          height: 1.5,
          backgroundColor: muiAlpha(theme.palette.error.main, 0.28),
          borderRadius: 999
        }}
      />
    </Box>
  );

  const AlertBanner = alertMessage ? (
    <SlideDown in={!!alertMessage} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 64, sm: 74 },
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1500,
          px: { xs: 1, sm: 2 }
        }}>
        <Paper
          elevation={10}
          sx={{
            width: 'min(960px, 95vw)',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${accentBorder}`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 18px 48px -26px rgba(0,0,0,0.65)'
                : '0 18px 48px -26px rgba(74,63,150,0.45)'
          }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              py: 1.4,
              background: `linear-gradient(135deg, ${muiAlpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.22 : 0.16
              )}, ${muiAlpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)})`,
              borderBottom: `1px solid ${accentBorder}`
            }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
              <MailOutlineIcon
                sx={{
                  color: theme.palette.primary.main,
                  filter:
                    theme.palette.mode === 'dark'
                      ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))'
                      : 'drop-shadow(0 6px 14px rgba(68,60,145,0.35))'
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.2 }}>
                  {extractTitle(alertMessage.content)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatRelativeFromTimestamp(alertMessage.created_at)}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  handleOpenInbox();
                  handleCloseAlert();
                }}
                sx={{
                  textTransform: 'none',
                  borderColor: accentBorder,
                  color: theme.palette.primary.main,
                  fontWeight: 700
                }}>
                Open inbox
              </Button>
              <IconButton size="small" onClick={handleCloseAlert}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>
          <Box sx={{ px: 2, py: 1.5, maxHeight: '40vh', overflowY: 'auto' }}>
            {renderMessageBody(alertMessage)}
          </Box>
        </Paper>
      </Box>
    </SlideDown>
  ) : null;

  return (
    <>
      <IconButton
        size={iconSize}
        disabled={isLoading || !relayReady || !address}
        onClick={() => handleOpenInbox()}
        sx={{
          color: theme.palette.common.white,
          position: 'relative',
          borderRadius: 2,
          backgroundColor: muiAlpha(theme.palette.common.white, 0.08),
          '&:hover': {
            opacity: 0.82,
            backgroundColor: muiAlpha(theme.palette.common.white, 0.08)
          }
        }}>
        <Badge
          color="secondary"
          max={99}
          badgeContent={
            isLoading
              ? undefined
              : unreadCount && unreadCount > 0
                ? unreadCount
                : undefined
          }
          overlap="circular"
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <MailOutlineIcon
              fontSize={iconSize === 'small' ? 'small' : 'medium'}
              sx={{ color: 'inherit' }}
            />
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: -4,
                  display: 'grid',
                  placeItems: 'center'
                }}>
                <Box
                  sx={{
                    width: iconSize === 'small' ? 24 : 28,
                    height: iconSize === 'small' ? 24 : 28,
                    borderRadius: '50%',
                    border: `2px solid ${muiAlpha(theme.palette.common.white, 0.2)}`,
                    borderTopColor: theme.palette.primary.main,
                    animation: 'dm-spin 0.9s linear infinite'
                  }}
                />
              </Box>
            )}
          </Box>
        </Badge>
      </IconButton>
      <style jsx global>{`
        @keyframes dm-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes dm-arrive {
          0% {
            box-shadow: 0 0 0 0 ${muiAlpha(theme.palette.primary.main, 0.35)};
            transform: translateY(10px) scale(0.99);
          }
          35% {
            box-shadow: 0 0 0 12px ${muiAlpha(theme.palette.primary.main, 0.16)};
            transform: translateY(0) scale(1);
          }
          100% {
            box-shadow: 0 0 0 0 ${muiAlpha(theme.palette.primary.main, 0)};
            transform: translateY(0) scale(1);
          }
        }
        @keyframes dm-fade-border {
          0% {
            border-color: ${muiAlpha(theme.palette.primary.main, 0.65)};
          }
          100% {
            border-color: transparent;
          }
        }
      `}</style>

      {AlertBanner}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isSmall}
        TransitionComponent={SlideDown}
        TransitionProps={{ onEntered: handleDialogEntered }}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: { xs: '92vw', sm: 860, md: 940 },
            maxHeight: { xs: '90vh', sm: '82vh' },
            minHeight: { xs: '78vh', sm: 'auto' },
            mx: { xs: 1, sm: 'auto' },
            borderRadius: isSmall ? 0 : 3,
            overflow: 'hidden',
            border: `1px solid ${accentBorder}`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 24px 58px -34px rgba(0,0,0,0.8)'
                : '0 24px 58px -36px rgba(75,63,150,0.35)'
          }
        }}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pb: 1
          }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <MailOutlineIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>
              Direct messages
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            background: `linear-gradient(180deg, ${muiAlpha(
              theme.palette.background.default,
              0.98
            )}, ${muiAlpha(theme.palette.background.paper, 0.9)})`
          }}>
          {!hasMessages ? (
            <Box
              sx={{
                width: '100%',
                minHeight: { xs: '340px', md: '420px' },
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                textAlign: 'center',
                px: 3,
                py: 4,
                backgroundImage: `radial-gradient(circle at 20% 20%, ${muiAlpha(
                  theme.palette.primary.main,
                  theme.palette.mode === 'dark' ? 0.15 : 0.12
                )}, transparent 38%), radial-gradient(circle at 80% 30%, ${muiAlpha(
                  theme.palette.secondary.main,
                  theme.palette.mode === 'dark' ? 0.16 : 0.12
                )}, transparent 40%), linear-gradient(135deg, ${muiAlpha(
                  theme.palette.background.paper,
                  0.8
                )}, ${muiAlpha(theme.palette.background.default, 0.9)})`,
                backdropFilter: 'blur(6px)',
                border: `1px dashed ${muiAlpha(theme.palette.primary.main, 0.25)}`
              }}>
              <Stack spacing={1} alignItems="center" sx={{ maxWidth: 420 }}>
                <MailOutlineIcon
                  sx={{
                    fontSize: 42,
                    color: muiAlpha(theme.palette.primary.main, 0.8)
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {isLoading ? 'Listening for direct messages...' : 'No direct messages yet'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Messages from your miner will appear here when they arrive.
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Paper
              sx={{
                minHeight: isSmall ? '68vh' : 420,
                borderRadius: 2.5,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                bgcolor: 'transparent',
                boxShadow: 'none'
              }}>
              <Box
                ref={messagesRef}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 1.1, md: 1.5 },
                  p: { xs: 1.2, md: 1.4 },
                  pr: { xs: 1, md: 1.1 },
                  pb: { xs: 1.4, md: 2.4 },
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: muiAlpha(theme.palette.text.primary, 0.2),
                    borderRadius: 999
                  }
                }}>
                {isLoading && (
                  <LinearProgress
                    sx={{
                      mx: { xs: 0.75, md: 1 },
                      mb: 0.75,
                      borderRadius: 999
                    }}
                  />
                )}
                {groupedMessages.length === 0 ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}>
                    <Typography variant="body2">No messages yet.</Typography>
                  </Box>
                ) : (
                  groupedMessages.map((group) => (
                    <Box key={group.dateKey} sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'text.secondary',
                          fontSize: '0.8rem',
                          mx: 1.4
                        }}>
                        <Box
                          sx={{
                            flex: 1,
                            height: '1px',
                            backgroundImage: `linear-gradient(90deg, transparent, ${muiAlpha(
                              theme.palette.primary.main,
                              0.18
                            )}, transparent)`
                          }}
                        />
                        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                          {group.label}
                        </Typography>
                        <Box
                          sx={{
                            flex: 1,
                            height: '1px',
                            backgroundImage: `linear-gradient(90deg, transparent, ${muiAlpha(
                              theme.palette.primary.main,
                              0.18
                            )}, transparent)`
                          }}
                      />
                    </Box>
                    {group.items.map((msg, idx) => {
                      const createdMs = (msg.created_at ?? 0) * 1000 || Date.now();
                      const shortTime = dayjs(createdMs).format('h:mm A');
                      const longTime = dayjs(createdMs).format('MMM D, YYYY h:mm:ss A');
                      const isLastGroup =
                        group.dateKey === groupedMessages[groupedMessages.length - 1].dateKey;
                      const isLast = isLastGroup && idx === group.items.length - 1;
                      const showUnreadDivider = unreadDividerMessageId === msg.id;
                      return (
                        <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                          {showUnreadDivider && <UnreadDivider />}
                          <Box
                            ref={isLast ? lastMessageRef : undefined}
                            sx={{
                              position: 'relative',
                              alignSelf: 'flex-start',
                              maxWidth: { xs: '100%', md: '76%' },
                              minWidth: { xs: '100%', sm: 220 },
                              width: { xs: '100%', md: 'fit-content' },
                              borderRadius: { xs: 2, md: 1.5 },
                              p: { xs: 1.05, md: 1.25 },
                              backgroundColor: muiAlpha(theme.palette.primary.main, 0.08),
                              border:
                                highlightedMessageId === msg.id
                                  ? `1px solid ${muiAlpha(theme.palette.primary.main, 0.45)}`
                                  : '1px solid transparent',
                              boxShadow:
                                theme.palette.mode === 'dark'
                                  ? '0 10px 28px -18px rgba(0,0,0,0.6)'
                                  : '0 12px 32px -20px rgba(60,45,120,0.25)',
                              scrollMarginBottom: { xs: 80, md: 110 },
                              animation:
                                highlightedMessageId === msg.id
                                  ? 'dm-arrive 1.6s ease-out, dm-fade-border 2.1s ease-out'
                                  : 'none',
                              transition: 'border-color 0.4s ease'
                            }}>
                            <MarkdownViewer
                              key={msg.id}
                              markdown={msg.content || ''}
                              readOnly
                              plugins={viewerPlugins}
                              contentEditableClassName="mdxeditor-root-contenteditable"
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                              <Tooltip title={longTime}>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {shortTime}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))
              )}
                <Box
                  ref={noticeRef}
                  sx={{
                    width: { xs: '100%', md: '80%' },
                    maxWidth: { xs: '100%', md: 720 },
                    alignSelf: 'center',
                    mt: { xs: 1, md: 1.25 },
                    p: { xs: 1, md: 1.5 },
                    borderRadius: { xs: 1.5, md: 2 },
                    backgroundColor: muiAlpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.14 : 0.1
                    ),
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 10px 26px -18px rgba(0,0,0,0.65)'
                        : '0 12px 32px -20px rgba(60,45,120,0.25)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.6,
                    textAlign: 'center',
                    mb: { xs: 1, md: 1.25 }
                  }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    This conversation is read-only.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    For support or contact, write in Discord #mining or DM us there.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DirectMessagesCenter;
