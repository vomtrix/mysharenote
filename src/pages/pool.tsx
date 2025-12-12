import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPublicKey, nip19 } from 'nostr-tools';
import LockIcon from '@mui/icons-material/Lock';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { alpha as muiAlpha, useTheme } from '@mui/material/styles';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  InputAdornment,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  tablePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  codeMirrorPlugin,
  codeBlockPlugin,
  CodeToggle,
  HighlightToggle,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertCodeBlock,
  InsertThematicBreak,
  InsertAdmonition,
  Separator,
  directivesPlugin,
  AdmonitionDirectiveDescriptor
} from '@mdxeditor/editor';
import { Container } from 'typedi';
import { useDispatch, useSelector } from '@store/store';
import {
  getDirectMessages,
  getDirectMessagesLastOpenedAt,
  getIsDirectMessagesLoading,
  getRelayReady,
  getSettings
} from '@store/app/AppSelectors';
import {
  connectRelay,
  getDirectMessages as subscribeDirectMessages,
  stopDirectMessages
} from '@store/app/AppThunks';
import { setDirectMessagesLastOpened } from '@store/app/AppReducer';
import { formatRelativeFromTimestamp } from '@utils/time';
import { publicKeyInputToDisplayValue, toHexPublicKey } from '@utils/nostr';
import { validateAddress } from '@utils/helpers';
import { RelayService } from '@services/api/RelayService';

const SESSION_STORAGE_KEY = 'pool';
const DM_LAST_OPENED_STORAGE_KEY = 'dm_last_opened';

type PoolSession = {
  pubkeyHex: string;
  npub: string;
  privHex: string;
};

const MarkdownEditor = dynamic(() => import('@mdxeditor/editor').then((mod) => mod.MDXEditor), {
  ssr: false
});
const MarkdownViewer = MarkdownEditor;

const decodePrivateKey = (value: string): PoolSession | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const toBytesFromHex = (hex: string) => {
    if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
    return Uint8Array.from(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  };

  const toBytesFromBigInt = (input: string) => {
    try {
      const bn = BigInt(input);
      const hex = bn.toString(16).padStart(64, '0');
      return toBytesFromHex(hex);
    } catch {
      return null;
    }
  };

  const tryFromBytes = (privBytes: Uint8Array | null): PoolSession | null => {
    if (!privBytes || privBytes.length !== 32) return null;
    const privHex = Array.from(privBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const pubkeyHex = getPublicKey(privBytes);
    const npub = publicKeyInputToDisplayValue(pubkeyHex);
    return { pubkeyHex, npub, privHex };
  };

  // Accept raw hex
  const hexBytes = toBytesFromHex(trimmed);
  if (hexBytes) return tryFromBytes(hexBytes);

  // Accept bigint string
  const bigintBytes = toBytesFromBigInt(trimmed);
  if (bigintBytes) return tryFromBytes(bigintBytes);

  try {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== 'nsec') return null;
    const data = decoded.data as string | Uint8Array | number[];
    const privBytes =
      data instanceof Uint8Array
        ? data
        : typeof data === 'string'
            ? Uint8Array.from(
                data.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
              )
          : Array.isArray(data)
            ? Uint8Array.from(data)
            : null;
    return tryFromBytes(privBytes);
  } catch {
    return null;
  }
};

const PoolPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const messages = useSelector(getDirectMessages);
  const settings = useSelector(getSettings);
  const lastOpenedAt = useSelector(getDirectMessagesLastOpenedAt);
  const loading = useSelector(getIsDirectMessagesLoading);
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const relayReady = useSelector(getRelayReady);
  const [session, setSession] = useState<PoolSession | null>(null);
  const [nsecInput, setNsecInput] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [contactInput, setContactInput] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isContactSearchOpen, setIsContactSearchOpen] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isComposingNew, setIsComposingNew] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'address' | 'body' | null>(null);
  const hasConnectedRelayRef = useRef(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const composeBodyRef = useRef<MDXEditorMethods | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (!raw) return;
    try {
      const privHex = raw.trim();
      const bytes =
        /^[0-9a-f]{64}$/i.test(privHex) &&
        Uint8Array.from(privHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      if (!bytes || bytes.length !== 32) return;
      const pubkeyHex = getPublicKey(bytes);
      const npub = publicKeyInputToDisplayValue(pubkeyHex);
      setSession({ privHex, pubkeyHex, npub });
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(DM_LAST_OPENED_STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (Number.isFinite(parsed)) {
            dispatch(setDirectMessagesLastOpened(parsed));
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [dispatch]);

  useEffect(() => {
    if (hasConnectedRelayRef.current) return;
    if (!settings?.relay) return;
    dispatch(connectRelay(settings.relay));
    hasConnectedRelayRef.current = true;
  }, [dispatch, settings?.relay]);

  useEffect(() => {
    if (!session || !relayReady) return;
    if (settings?.workProviderPublicKey) {
      try {
        const providerHex = toHexPublicKey(settings.workProviderPublicKey).toLowerCase();
        if (providerHex !== session.pubkeyHex.toLowerCase()) {
          setSessionError('Provided key does not match configured work provider.');
          return;
        }
      } catch {
        return;
      }
    }
    dispatch(subscribeDirectMessages(undefined));
    return () => {
      dispatch(stopDirectMessages());
    };
  }, [dispatch, relayReady, session, settings.workProviderPublicKey]);

  useEffect(() => {
    if (!messages.length) {
      setSelectedMessageId(null);
      return;
    }
    if (isComposingNew) return;
    if (!selectedMessageId) {
      setSelectedMessageId(messages[0].id);
    }
  }, [isComposingNew, messages, selectedMessageId]);

  const contacts = useMemo(() => {
    const entries = new Map<string, { lastAt: number; count: number }>();
    messages.forEach((msg) => {
      const contactKey = msg.address || 'Unknown';
      const lastAt = msg.created_at ?? 0;
      const existing = entries.get(contactKey);
      if (!existing || existing.lastAt < lastAt) {
        entries.set(contactKey, { lastAt, count: (existing?.count ?? 0) + 1 });
      } else {
        entries.set(contactKey, { ...existing, count: (existing?.count ?? 0) + 1 });
      }
    });
    return Array.from(entries.entries())
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => b.lastAt - a.lastAt);
  }, [messages]);

  const visibleContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => c.id.toLowerCase().includes(term));
  }, [contacts, contactSearch]);

  useEffect(() => {
    if (!visibleContacts.length || isComposingNew) return;
    if (!selectedContact || !visibleContacts.some((c) => c.id === selectedContact)) {
      setSelectedContact(visibleContacts[0].id);
    }
  }, [isComposingNew, selectedContact, visibleContacts]);

  const filteredMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages.filter((msg) => msg.address === selectedContact);
  }, [messages, selectedContact]);

  const selectedMessage =
    filteredMessages.find((msg) => msg.id === selectedMessageId) ?? filteredMessages[0];

  useEffect(() => {
    if (!selectedContact || isComposingNew) return;
    const selectedMatches = messages.find(
      (msg) => msg.id === selectedMessageId && msg.address === selectedContact
    );
    if (selectedMatches) return;
    const firstForContact = messages.find((msg) => msg.address === selectedContact);
    if (firstForContact) {
      setSelectedMessageId(firstForContact.id);
    }
  }, [isComposingNew, messages, selectedContact, selectedMessageId]);

  const handleLogin = () => {
    setSessionError(null);
    const decoded = decodePrivateKey(nsecInput);
    if (!decoded) {
      setSessionError('Private key must be 32 bytes (hex, bigint, or nsec)');
      return;
    }
    setSession(decoded);
    localStorage.setItem(SESSION_STORAGE_KEY, decoded.privHex);
    const now = Math.floor(Date.now() / 1000);
    dispatch(setDirectMessagesLastOpened(now));
    localStorage.setItem(DM_LAST_OPENED_STORAGE_KEY, String(now));
  };

  const badgeNewCount = useMemo(() => {
    if (!messages.length) return 0;
    if (!lastOpenedAt) return messages.length;
    return messages.filter((msg) => (msg.created_at ?? 0) > lastOpenedAt).length;
  }, [lastOpenedAt, messages]);

  const emptyState = !messages.length;
  const contactHasMessages = selectedContact
    ? filteredMessages.some((msg) => msg.address === selectedContact)
    : false;
  const recipientAddress = (isComposingNew ? contactInput : selectedContact ?? '').trim();
  const isRecipientValid = !!recipientAddress && validateAddress(recipientAddress, settings?.network);
  const canSend = !!session && !!composeBody.trim() && isRecipientValid && !sending;
  const noMessagesForContact = !emptyState && filteredMessages.length === 0;
  const showSuccessState = sendSuccess;
  const showPreview =
    contactHasMessages && selectedMessage && !isComposingNew && !showSuccessState;
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
  const editorPlugins = useMemo(
    () => [
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <HighlightToggle />
            <Separator />
            <BlockTypeSelect />
            <ListsToggle />
            <CreateLink />
            <InsertTable />
            <Separator />
            <CodeToggle />
            <InsertCodeBlock />
            <InsertThematicBreak />
            <InsertAdmonition />
          </>
        )
      }),
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
      codeMirrorPlugin({ codeBlockLanguages }),
      tablePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin()
    ],
    [codeBlockLanguages]
  );
  useEffect(() => {
    if (session && typeof window !== 'undefined') {
      const now = Math.floor(Date.now() / 1000);
      dispatch(setDirectMessagesLastOpened(now));
      localStorage.setItem(DM_LAST_OPENED_STORAGE_KEY, String(now));
    }
  }, [dispatch, session]);

  const handleComposeSend = () => {
    if (!session) return;
    const targetAddress = recipientAddress;
    if (!targetAddress) {
      setSendError('Miner address required');
      return;
    }
    if (!isRecipientValid) {
      setSendError('Invalid miner address');
      return;
    }
    if (!composeBody.trim()) {
      setSendError('Message cannot be empty');
      return;
    }
    setSendError(null);
    setSendSuccess(false);
    setSending(true);
    (async () => {
      try {
        const relayService = Container.get(RelayService);
        await relayService.publishDirectMessage(session.privHex, composeBody.trim(), targetAddress);
        setComposeBody('');
        if (!selectedContact) setSelectedContact(targetAddress);
        setSendSuccess(true);
      } catch (err: any) {
        setSendError(err?.message || 'Failed to send message');
      } finally {
        setSending(false);
      }
    })();
  };

  const handleNewFromMiners = () => {
    setSelectedMessageId(null);
    setSelectedContact('');
    setContactInput('');
    setIsComposingNew(true);
    setComposeBody('');
    setSendError(null);
    setSendSuccess(false);
    setFocusTarget('address');
  };

  const handleNewFromMessages = () => {
    setSelectedMessageId(null);
    setIsComposingNew(true);
    setComposeBody('');
    setSendError(null);
    setContactInput(selectedContact ?? '');
    setSendSuccess(false);
    setFocusTarget(selectedContact ? 'body' : 'address');
  };

  const handleSelectMessageClick = (id: string) => {
    setSendSuccess(false);
    setIsComposingNew(false);
    setSelectedMessageId(id);
    const msg = messages.find((m) => m.id === id);
    if (msg?.address) {
      setSelectedContact(msg.address);
    }
  };

  const handleContactClick = (contactId: string) => {
    setSendSuccess(false);
    setIsComposingNew(false);
    setSelectedContact(contactId);
    const firstForContact = messages.find((msg) => msg.address === contactId);
    setSelectedMessageId(firstForContact?.id ?? null);
  };

  useEffect(() => {
    if (!isComposingNew || !focusTarget) return;
    if (focusTarget === 'address' && addressInputRef.current) {
      addressInputRef.current.focus();
      addressInputRef.current.select();
      setFocusTarget(null);
      return;
    }
    if (focusTarget === 'body' && composeBodyRef.current) {
      const editor = composeBodyRef.current as any;
      if (typeof editor?.focus === 'function') {
        editor.focus();
      } else if (typeof editor?.getRootElement === 'function') {
        editor.getRootElement()?.focus?.();
      }
      setFocusTarget(null);
    }
  }, [focusTarget, isComposingNew]);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 1, md: 2 },
        py: { xs: 2, md: 3 },
        background: `linear-gradient(140deg, ${muiAlpha(
          theme.palette.primary.main,
          0.28
        )}, ${muiAlpha(theme.palette.background.default, 0.9)})`
      }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
        <Box
          sx={{
            position: 'absolute',
            inset: '-30%',
            background: `
              radial-gradient(1px 1px at 20% 20%, ${muiAlpha(theme.palette.common.white, 0.55)}, transparent 55%),
              radial-gradient(1px 1px at 60% 30%, ${muiAlpha(theme.palette.common.white, 0.55)}, transparent 55%),
              radial-gradient(1px 1px at 30% 70%, ${muiAlpha(theme.palette.common.white, 0.55)}, transparent 55%),
              radial-gradient(1px 1px at 80% 80%, ${muiAlpha(theme.palette.common.white, 0.55)}, transparent 55%)
            `,
            backgroundSize: '320px 320px',
            opacity: 0.35,
            animation: 'pool-stars 26s linear infinite'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${muiAlpha(theme.palette.primary.main, 0.12)}, transparent 58%)`,
            top: '-10%',
            left: '-12%',
            filter: 'blur(10px)',
            animation: 'pool-glow 12s ease-in-out infinite alternate'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${muiAlpha(theme.palette.secondary.main, 0.12)}, transparent 60%)`,
            bottom: '-12%',
            right: '-10%',
            filter: 'blur(10px)',
            animation: 'pool-glow 14s ease-in-out infinite alternate-reverse'
          }}
        />
      </Box>
      <style jsx global>{`
        @keyframes pool-glow {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(8deg) scale(1.04);
          }
        }
        @keyframes pool-stars {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-20px);
          }
        }
      `}</style>
      <Dialog
        open={!session}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: `1px solid ${muiAlpha(theme.palette.primary.main, 0.25)}`,
            background: `linear-gradient(160deg, ${muiAlpha(
              theme.palette.background.paper,
              0.92
            )}, ${muiAlpha(theme.palette.background.default, 0.88)})`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 30px 80px -40px rgba(0,0,0,0.9)'
                : '0 30px 80px -45px rgba(60,45,120,0.35)'
          }
        }}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pb: 1
          }}>
          <LockIcon color="primary" />
          <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>
            {t('pool.dmLogin', { defaultValue: 'Pool mail login' })}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Enter the pool operator private key (nsec) to open the inbox. We only keep it in your
              browser session.
            </Typography>
            <TextField
              label="Private key (nsec... or hex)"
              value={nsecInput}
              onChange={(e) => setNsecInput(e.target.value)}
              fullWidth
              size="small"
              autoFocus
              onFocus={() => setSessionError(null)}
              onChangeCapture={() => {
                if (sessionError) setSessionError(null);
              }}
            />
            <TextField
              label="App public key (npub)"
              value={publicKeyInputToDisplayValue(settings?.workProviderPublicKey)}
              fullWidth
              size="small"
              disabled
            />
            {sessionError && (
              <Typography variant="body2" color="error">
                {sessionError}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleLogin}
              startIcon={<MailOutlineIcon />}
              sx={{ textTransform: 'none', fontWeight: 700 }}>
              Open inbox
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {session && (
        <Box
          sx={{
            width: '100%',
            maxWidth: '1280px',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '280px 360px minmax(460px, 1.2fr)'
            },
            gap: { xs: 2, md: 2.5 },
            alignItems: 'stretch',
            minHeight: '80vh',
            mx: 'auto'
          }}>
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${muiAlpha(theme.palette.divider, 0.8)}`,
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.7)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'wrap'
              }}>
              {isContactSearchOpen ? (
                <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    autoFocus
                    size="small"
                    placeholder="Search miners..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsContactSearchOpen(false);
                        setContactSearch('');
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: contactSearch ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setContactSearch('')}
                            aria-label="Clear search">
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: muiAlpha(theme.palette.background.paper, 0.85)
                      }
                    }}
                  />
                  <Tooltip title="Close search">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsContactSearchOpen(false);
                        setContactSearch('');
                      }}
                      aria-label="Close search">
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Miners
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {badgeNewCount > 0 && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.4,
                          borderRadius: 999,
                          backgroundColor: muiAlpha(theme.palette.primary.main, 0.12),
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textAlign: 'center'
                        }}>
                        {badgeNewCount} new
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => setIsContactSearchOpen(true)}
                      aria-label="Search miners">
                      <SearchIcon />
                    </IconButton>
                    <Button
                      size="small"
                      startIcon={<PersonAddAlt1Icon />}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                      onClick={handleNewFromMiners}>
                      New miner
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
            {loading && <LinearProgress color="primary" />}
            <List
              sx={{
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: muiAlpha(theme.palette.text.primary, 0.2),
                  borderRadius: 999
                }
              }}>
              {visibleContacts.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    color: 'text.secondary'
                  }}>
                  <Typography variant="body2">
                    {contacts.length === 0 ? 'No contacts yet.' : 'No miners match your search.'}
                  </Typography>
                </Box>
              ) : (
                visibleContacts.map((contact) => (
                  <ListItemButton
                    key={contact.id}
                    selected={selectedContact === contact.id && !isComposingNew}
                    onClick={() => handleContactClick(contact.id)}
                    sx={{
                      borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.6)}`
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          backgroundColor: muiAlpha(theme.palette.primary.main, 0.2),
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                        {contact.id.slice(-3).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                          {contact.id}
                        </Typography>
                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.3, color: 'text.secondary' }}>
                          <Typography variant="caption">
                            {formatRelativeFromTimestamp(contact.lastAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            • {contact.count} msgs
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </ListItemButton>
                ))
              )}
            </List>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${muiAlpha(theme.palette.divider, 0.8)}`,
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.7)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1
              }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Messages
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Copy address">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (selectedContact) {
                          navigator.clipboard?.writeText(selectedContact).catch(() => undefined);
                        }
                      }}
                      disabled={!selectedContact}
                      sx={{
                        border: 'none',
                        backgroundColor: muiAlpha(theme.palette.primary.main, 0.08),
                        color: theme.palette.text.primary
                      }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  size="small"
                  startIcon={<EditNoteIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                  onClick={handleNewFromMessages}>
                  Compose
                </Button>
              </Stack>
            </Box>
            {emptyState ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 3,
                  py: 6,
                  textAlign: 'center',
                  backgroundImage: `linear-gradient(135deg, ${muiAlpha(
                    theme.palette.primary.main,
                    0.08
                  )}, ${muiAlpha(theme.palette.secondary.main, 0.06)})`
                }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  You have no messages in the last 7 days.
                </Typography>
              </Box>
            ) : noMessagesForContact ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 3,
                  py: 6,
                  textAlign: 'center',
                  color: 'text.secondary',
                  backgroundImage: `linear-gradient(135deg, ${muiAlpha(
                    theme.palette.background.paper,
                    0.94
                  )}, ${muiAlpha(theme.palette.background.default, 0.9)})`,
                  borderRadius: 0
                }}>
                <Stack spacing={1.5} alignItems="center">
                  <MailOutlineIcon sx={{ fontSize: 54, color: muiAlpha(theme.palette.primary.main, 0.8) }} />
                  <Typography variant="body2">
                    No messages have been sent for this address yet.
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <List
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: muiAlpha(theme.palette.text.primary, 0.2),
                    borderRadius: 999
                  }
                }}>
                {filteredMessages.map((msg) => {
                  const isNew = !lastOpenedAt || (msg.created_at ?? 0) > (lastOpenedAt ?? 0);
                  return (
                    <ListItemButton
                      key={msg.id}
                      selected={!isComposingNew && selectedMessageId === msg.id}
                      onClick={() => handleSelectMessageClick(msg.id)}
                      alignItems="flex-start"
                      sx={{
                        borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.6)}`,
                        backgroundColor:
                          !isComposingNew && selectedMessageId === msg.id
                            ? muiAlpha(
                                theme.palette.primary.main,
                                theme.palette.mode === 'dark' ? 0.16 : 0.1
                              )
                            : 'transparent'
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
                              variant="subtitle2"
                              sx={{
                                fontWeight: isNew ? 800 : 600,
                                color: isNew ? theme.palette.text.primary : 'text.secondary',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}>
                              {msg.content.slice(0, 140) || 'Message'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatRelativeFromTimestamp(msg.created_at)}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${muiAlpha(theme.palette.divider, 0.8)}`,
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: isMdUp ? 'auto' : 320
            }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${muiAlpha(theme.palette.divider, 0.7)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1
              }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {showSuccessState
                  ? 'Message sent'
                  : showPreview
                  ? 'Preview'
                  : 'New message to miner'}
              </Typography>
              {showPreview && selectedMessage && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatRelativeFromTimestamp(selectedMessage.created_at)}
                </Typography>
              )}
            </Box>
            {showSuccessState ? (
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: { xs: 3, md: 4 },
                  overflow: 'hidden',
                  textAlign: 'center'
                }}>
                <Stack spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
                  <Box
                    sx={{
                      width: 96,
                      height: 96,
                      display: 'grid',
                      placeItems: 'center'
                    }}>
                    <MailOutlineIcon
                      sx={{ fontSize: 76, color: theme.palette.primary.main }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Message sent
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 520 }}>
                    {recipientAddress
                      ? `We delivered your message to ${recipientAddress}.`
                      : 'Your message has been delivered.'}
                  </Typography>
                </Stack>
              </Box>
            ) : showPreview ? (
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: { xs: 2, md: 3 },
                  background: `linear-gradient(180deg, ${muiAlpha(
                    theme.palette.background.paper,
                    0.95
                  )}, ${muiAlpha(theme.palette.background.default, 0.92)})`
                }}>
                <MarkdownViewer
                  key={selectedMessage.id}
                  markdown={selectedMessage.content || ''}
                  readOnly
                  plugins={viewerPlugins}
                  contentEditableClassName="mdxeditor-root-contenteditable"
                />
              </Box>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  p: { xs: 2, md: 3 }
                }}>
                <TextField
                  label="To (miner address)"
                  size="small"
                  value={isComposingNew ? contactInput : selectedContact ?? ''}
                  onChange={(e) => {
                    setSelectedContact(e.target.value);
                    setContactInput(e.target.value);
                    if (sendSuccess) setSendSuccess(false);
                  }}
                  placeholder="Enter miner address"
                  disabled={!isComposingNew}
                  fullWidth
                  inputRef={addressInputRef}
                />
                <Box
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${muiAlpha(theme.palette.divider, 0.7)}`,
                    backgroundColor: muiAlpha(theme.palette.background.paper, 0.85),
                    minHeight: isMdUp ? 320 : 220,
                    p: '8px 10px',
                    '& .mdxeditor-content': {
                      minHeight: isMdUp ? 300 : 200
                    }
                  }}>
                  <MarkdownEditor
                    ref={composeBodyRef}
                    markdown={composeBody}
                    onChange={(val: string) => setComposeBody(val)}
                    plugins={editorPlugins}
                    placeholder="Write your message..."
                    contentEditableClassName="mdxeditor-content"
                  />
                </Box>
                {sendError && (
                  <Typography variant="body2" color="error">
                    {sendError}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<SendOutlinedIcon />}
                    disabled={!canSend}
                    onClick={handleComposeSend}
                    sx={{ textTransform: 'none', fontWeight: 700 }}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

// Hide global chrome for full-screen workspace
(PoolPage as any).hideChrome = true;

export default PoolPage;
