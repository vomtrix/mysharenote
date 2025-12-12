import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
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
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from '@store/store';
import {
  getAddress,
  getDirectMessages,
  getDirectMessagesLastOpenedAt,
  getIsDirectMessagesLoading
} from '@store/app/AppSelectors';
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

const SlideDown = (props: TransitionProps & { children: ReactElement<any, any> }) => (
  <Slide {...props} direction="down" />
);

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

  const buildPreview = (text: string) => {
  const clean = normalizePreviewText(text);
  if (clean.length <= MAX_PREVIEW_LENGTH) return clean;
  return `${clean.slice(0, MAX_PREVIEW_LENGTH)}...`;
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
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<IDirectMessageEvent | null>(null);
  const seenAlertsRef = useRef<Set<string>>(new Set());

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

  const effectiveLastOpened = useMemo(() => {
    if (typeof lastOpenedAt === 'number' && Number.isFinite(lastOpenedAt)) return lastOpenedAt;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(DM_LAST_OPENED_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }, [lastOpenedAt]);

  const hasMessages = relevantMessages.length > 0;

  useEffect(() => {
    if (!hasMessages) {
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(relevantMessages[0].id);
      return;
    }
    const exists = relevantMessages.some((msg) => msg.id === selectedId);
    if (!exists) {
      setSelectedId(relevantMessages[0]?.id ?? null);
    }
  }, [hasMessages, relevantMessages, selectedId]);

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

  const handleSelectMessage = (message: IDirectMessageEvent) => {
    setSelectedId(message.id);
  };

  const unreadCount = useMemo(() => {
    if (!relevantMessages.length) return 0;
    if (!effectiveLastOpened) return relevantMessages.length;
    return relevantMessages.filter((msg) => (msg.created_at ?? 0) > effectiveLastOpened).length;
  }, [effectiveLastOpened, relevantMessages]);

  const selectedMessage = relevantMessages.find((msg) => msg.id === selectedId) ?? null;

  const accentSurface = muiAlpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.12);
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

  const updateLastOpenedNow = () => {
    const now = Math.floor(Date.now() / 1000);
    dispatch(setDirectMessagesLastOpened(now));
    if (typeof window !== 'undefined') {
      localStorage.setItem(DM_LAST_OPENED_STORAGE_KEY, String(now));
    }
  };

  const handleOpenInbox = (forcedSelectedId?: string) => {
    updateLastOpenedNow();
    setOpen(true);
    if (forcedSelectedId) {
      setSelectedId(forcedSelectedId);
    }
  };

  useEffect(() => {
    if (open) {
      updateLastOpenedNow();
    }
  }, [dispatch, open]);

  const renderMessageBody = (message: IDirectMessageEvent) => (
    <MarkdownViewer
      key={message.id}
      markdown={message.content || ''}
      readOnly
      plugins={viewerPlugins}
      contentEditableClassName="mdxeditor-root-contenteditable"
    />
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
                  handleOpenInbox(alertMessage.id);
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
      `}</style>

      {AlertBanner}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        TransitionComponent={SlideDown}
        PaperProps={{
          sx: {
            borderRadius: 3,
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
            display: 'grid',
            gap: 2,
            gridTemplateColumns: hasMessages ? { xs: '1fr', md: '320px 1fr' } : '1fr',
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
            <>
              <Paper
                variant="outlined"
                sx={{
                  height: isSmall ? '320px' : '400px',
                  overflow: 'hidden',
                  borderRadius: 2,
                  borderColor: accentBorder,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: `1px solid ${accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Inbox
                  </Typography>
                  {isLoading && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Syncing...
                    </Typography>
                  )}
                </Box>
                <List
                  disablePadding
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: muiAlpha(theme.palette.text.primary, 0.2),
                      borderRadius: 999
                    }
                  }}>
                  {relevantMessages.map((message) => {
                    const isNew =
                      !effectiveLastOpened ||
                      (message.created_at ?? 0) > (effectiveLastOpened ?? 0);
                    return (
                      <ListItemButton
                        key={message.id}
                        onClick={() => handleSelectMessage(message)}
                        selected={selectedId === message.id}
                        alignItems="flex-start"
                        sx={{
                          borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.6)}`,
                          backgroundColor:
                            selectedId === message.id
                              ? muiAlpha(
                                  theme.palette.primary.main,
                                  theme.palette.mode === 'dark' ? 0.16 : 0.1
                                )
                              : 'transparent',
                          transition: 'background-color 120ms ease'
                        }}>
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ width: '100%', minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: isNew ? 800 : 600,
                                  color: isNew ? theme.palette.text.primary : 'text.secondary',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                                {buildPreview(message.content) || 'Message'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {formatRelativeFromTimestamp(message.created_at)}
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  minHeight: isSmall ? 'auto' : '400px',
                  borderRadius: 2,
                  borderColor: accentBorder,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                {!selectedMessage ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      px: 3,
                      textAlign: 'center'
                    }}>
                    <Typography variant="body2">Select a message to preview it.</Typography>
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: `1px solid ${accentBorder}`,
                        backgroundColor: accentSurface,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1
                      }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Message
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatRelativeFromTimestamp(selectedMessage.created_at)}
                      </Typography>
                    </Box>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: { xs: 1.25, md: 2 },
                    py: { xs: 1, md: 1.5 },
                    maxHeight: { xs: '40vh', md: 'none' }
                  }}>
                  {renderMessageBody(selectedMessage)}
                </Box>
              </>
            )}
              </Paper>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DirectMessagesCenter;
