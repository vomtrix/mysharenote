import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPublicKey, nip19 } from 'nostr-tools';
import dayjs from 'dayjs';
import LockIcon from '@mui/icons-material/Lock';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { alpha as muiAlpha, useTheme } from '@mui/material/styles';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Snackbar,
  Alert,
  LinearProgress,
  List,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  InputAdornment,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';
import MenuIcon from '@mui/icons-material/Menu';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  tablePlugin,
  thematicBreakPlugin,
  codeMirrorPlugin,
  codeBlockPlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  toolbarPlugin,
  markdownShortcutPlugin,
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
  Separator
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
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
  const [contactInput, setContactInput] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isContactSearchOpen, setIsContactSearchOpen] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [addMinerOpen, setAddMinerOpen] = useState(false);
  const [addMinerError, setAddMinerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [composeVersion, setComposeVersion] = useState(0);
  const [hasUserSelectedContact, setHasUserSelectedContact] = useState(false);
  const hasConnectedRelayRef = useRef(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const composeBodyRef = useRef<MDXEditorMethods | null>(null);
  const addMinerInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedRecipientRef = useRef<string | null>(null);

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
    if (!visibleContacts.length) return;
    if (!selectedContact) {
      setSelectedContact(visibleContacts[0].id);
    }
  }, [selectedContact, visibleContacts]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const searchInput = document.getElementById('miner-search-input');
      if (isContactSearchOpen && searchInput && !searchInput.contains(target)) {
        setIsContactSearchOpen(false);
        setContactSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [isContactSearchOpen]);

  const recipientAddress = (selectedContact ?? contactInput ?? '').trim();
  const displayRecipient = useMemo(() => {
    if (!recipientAddress) return '';
    if (recipientAddress.length <= 24) return recipientAddress;
    return `${recipientAddress.slice(0, 10)}…${recipientAddress.slice(-8)}`;
  }, [recipientAddress]);

  const filteredMessages = useMemo(() => {
    if (!recipientAddress) return [];
    return messages.filter((msg) => msg.address === recipientAddress);
  }, [messages, recipientAddress]);

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

  const isRecipientValid = !!recipientAddress && validateAddress(recipientAddress, settings?.network);
  const canSend = !!session && !!composeBody.trim() && isRecipientValid && !sending;
  const hasAnyMessages = messages.length > 0;
  const hasMessagesForContact = filteredMessages.length > 0;
  const sortedMessages = useMemo(
    () =>
      [...filteredMessages].sort(
        (a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)
      ),
    [filteredMessages]
  );
  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; label: string; items: typeof filteredMessages }[] = [];
    sortedMessages.forEach((msg) => {
      const tsMs = (msg.created_at ?? 0) * 1000 || Date.now();
      const dateKey = dayjs(tsMs).format('YYYY-MM-DD');
      const label = dayjs(tsMs).format('MMM D, YYYY');
      const existing = groups[groups.length - 1];
      if (!existing || existing.dateKey !== dateKey) {
        groups.push({ dateKey, label, items: [msg] });
      } else {
        existing.items.push(msg);
      }
    });
    return groups;
  }, [sortedMessages]);
  const lastMessageId = sortedMessages[sortedMessages.length - 1]?.id;
  const messageIdsSignature = useMemo(
    () => sortedMessages.map((m) => m.id).join('|'),
    [sortedMessages]
  );
  const lastMessageRelative = useMemo(() => {
    if (!sortedMessages.length) return null;
    return formatRelativeFromTimestamp(sortedMessages[sortedMessages.length - 1].created_at);
  }, [sortedMessages]);

  const scrollMessagesToBottom = useCallback(() => {
    const node = messagesScrollRef.current;
    if (!node) return;
    const doScroll = () => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({ block: 'end', behavior: 'auto' });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    };
    // rAF + microtask to ensure DOM has painted after message list changes
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 0);
  }, []);

  useEffect(() => {
    // Always anchor to the latest message when switching contacts or new messages arrive.
    scrollMessagesToBottom();
  }, [recipientAddress, messageIdsSignature, scrollMessagesToBottom]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isContactPanelOpen) {
        setIsContactPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isContactPanelOpen]);

  const focusComposer = useCallback(() => {
    const attempt = (depth: number) => {
      const editor = composeBodyRef.current as any;
      if (!editor) return;
      if (typeof editor.focus === 'function') {
        editor.focus();
        return;
      }
      if (typeof editor.getRootElement === 'function') {
        const root = editor.getRootElement();
        if (root) {
          const contentEditable = root.querySelector('[contenteditable="true"]') as HTMLElement | null;
          (contentEditable || root).focus?.();
          return;
        }
      }
      if (depth < 2) {
        requestAnimationFrame(() => attempt(depth + 1));
      }
    };
    attempt(0);
  }, []);

  useEffect(() => {
    if (addMinerOpen) {
      requestAnimationFrame(() => addMinerInputRef.current?.focus?.());
    }
  }, [addMinerOpen]);

  useEffect(() => {
    if (recipientAddress && (recipientAddress !== lastFocusedRecipientRef.current || hasUserSelectedContact)) {
      lastFocusedRecipientRef.current = recipientAddress;
      setHasUserSelectedContact(false);
      focusComposer();
    }
  }, [recipientAddress, focusComposer, hasUserSelectedContact]);
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

  const handleComposerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSend) handleComposeSend();
    }
  };

  const handleComposeSend = () => {
    if (!session) return;
    const targetAddress = recipientAddress;
    if (!targetAddress) {
      const msg = 'Miner address required';
      setSendError(msg);
      setToast({ message: msg, severity: 'error' });
      return;
    }
    if (!isRecipientValid) {
      const msg = 'Invalid miner address';
      setSendError(msg);
      setToast({ message: msg, severity: 'error' });
      return;
    }
    if (!composeBody.trim()) {
      const msg = 'Message cannot be empty';
      setSendError(msg);
      setToast({ message: msg, severity: 'error' });
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
        setComposeVersion((v) => v + 1);
        requestAnimationFrame(() => composeBodyRef.current?.focus?.());
        setSelectedContact(targetAddress);
        setContactInput(targetAddress);
        setSendSuccess(true);
        setToast({ message: 'Delivered to miner', severity: 'success' });
      } catch (err: any) {
        const msg = err?.message || 'Failed to send message';
        setSendError(msg);
        setToast({ message: msg, severity: 'error' });
      } finally {
        setSending(false);
      }
    })();
  };

  const handleNewFromMiners = () => {
    setAddMinerError(null);
    setContactInput('');
    setAddMinerOpen(true);
  };

  const handleConfirmAddMiner = () => {
    const trimmed = contactInput.trim();
    if (!trimmed) {
      setAddMinerError('Miner address required');
      setToast({ message: 'Miner address required', severity: 'error' });
      return;
    }
    if (!validateAddress(trimmed, settings?.network)) {
      setAddMinerError('Invalid miner address');
      setToast({ message: 'Invalid miner address', severity: 'error' });
      return;
    }
    setSelectedContact(trimmed);
    setAddMinerOpen(false);
    setSendError(null);
    setSendSuccess(false);
    setComposeBody('');
    setContactInput(trimmed);
    setIsContactPanelOpen(false);
    focusComposer();
    setHasUserSelectedContact(true);
  };

  const handleContactClick = (contactId: string) => {
    setSendSuccess(false);
    setSelectedContact(contactId);
    setContactInput(contactId);
    if (!isMdUp) setIsContactPanelOpen(false);
    focusComposer();
    setHasUserSelectedContact(true);
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        position: 'relative',
        overflow: 'hidden',
        px: 0,
        py: 0,
        background: `radial-gradient(120% 120% at 20% 20%, ${muiAlpha(
          theme.palette.primary.main,
          0.16
        )}, transparent 42%), ${theme.palette.background.default}`
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
      <Snackbar
        open={!!toast}
        autoHideDuration={2800}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast
          ? (
            <Alert
              onClose={() => setToast(null)}
              severity={toast.severity}
              variant="filled"
              sx={{ width: '100%' }}>
              {toast.message}
            </Alert>
          )
          : undefined}
      </Snackbar>
      <Dialog
        open={addMinerOpen}
        onClose={() => setAddMinerOpen(false)}
        fullWidth
        maxWidth="xs">
        <DialogTitle>Add miner</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Miner address"
              value={contactInput}
              autoFocus
              inputRef={addMinerInputRef}
              onChange={(e) => {
                setContactInput(e.target.value);
                if (addMinerError) setAddMinerError(null);
              }}
              fullWidth
              size="small"
              placeholder="fcxxxxxxxx"
            />
            {addMinerError && (
              <Typography variant="body2" color="error">
                {addMinerError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddMinerOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmAddMiner}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {session && (
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 0,
            background: `linear-gradient(170deg, ${muiAlpha(
              theme.palette.background.paper,
              0.98
            )}, ${muiAlpha(theme.palette.background.default, 0.96)})`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 32px 90px -48px rgba(0,0,0,0.9)'
                : '0 32px 90px -52px rgba(60,45,120,0.38)'
          }}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'stretch'
            }}>
            {!isMdUp && isContactPanelOpen && (
              <Box
                onClick={() => setIsContactPanelOpen(false)}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: muiAlpha(theme.palette.common.black, 0.5),
                  zIndex: 15
                }}
              />
            )}
            <Box
              sx={{
                position: { xs: 'absolute', md: 'relative' },
                inset: { xs: 0, md: 'auto' },
                width: { xs: '78vw', md: 320 },
                minHeight: 0,
                height: { xs: '100%', md: 'auto' },
                transform: {
                  xs: isContactPanelOpen ? 'translateX(0)' : 'translateX(-100%)',
                  md: 'none'
                },
                transition: 'transform 180ms ease',
                backgroundColor: muiAlpha(theme.palette.background.paper, 0.9),
                borderRight: `1px solid ${muiAlpha(theme.palette.primary.main, 0.28)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                p: 0,
                zIndex: 20
              }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  flexWrap: 'wrap',
                  backgroundColor: muiAlpha(theme.palette.primary.main, 0.08),
                  borderRadius: 0,
                  px: { xs: 1.25, md: 1.75 },
                  py: { xs: 1, md: 1.25 },
                  minHeight: 64,
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 8px 22px -16px rgba(0,0,0,0.85)'
                      : '0 10px 26px -18px rgba(60,45,120,0.32)'
                }}>
                {isContactSearchOpen ? (
                  <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      id="miner-search-input"
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
                          backgroundColor: muiAlpha(theme.palette.background.paper, 0.9)
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
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: muiAlpha(theme.palette.text.primary, 0.14),
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
                      selected={selectedContact === contact.id}
                      onClick={() => handleContactClick(contact.id)}
                      sx={{
                        my: 0.5,
                        ml: 0.5,
                        borderRadius: 3,
                        px: 1.25,
                        py: 1,
                        alignItems: 'flex-start',
                        backgroundColor:
                          selectedContact === contact.id
                            ? muiAlpha(theme.palette.primary.main, 0.1)
                            : muiAlpha(theme.palette.common.white, 0.05),
                        '&:hover': {
                          backgroundColor: muiAlpha(theme.palette.primary.main, 0.08)
                        }
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: muiAlpha(theme.palette.primary.main, 0.2),
                            color: theme.palette.primary.main,
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}>
                          {contact.id.slice(-3).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                            {contact.id}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.6}
                            alignItems="center"
                            sx={{ mt: 0.3, color: 'text.secondary' }}>
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
            </Box>
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                background: `linear-gradient(180deg, ${muiAlpha(
                  theme.palette.background.default,
                  0.98
                )}, ${muiAlpha(theme.palette.background.paper, 0.94)})`,
                p: 0
              }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  backgroundColor: muiAlpha(theme.palette.primary.main, 0.08),
                  borderRadius: 0,
                  px: { xs: 1.25, md: 1.75 },
                  py: { xs: 1, md: 1.25 },
                  minHeight: 64,
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 8px 24px -18px rgba(0,0,0,0.8)'
                      : '0 10px 26px -18px rgba(60,45,120,0.3)'
                }}>
                {!isMdUp && (
                  <IconButton onClick={() => setIsContactPanelOpen(true)} size="small">
                    <MenuIcon />
                  </IconButton>
                )}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      backgroundColor: muiAlpha(theme.palette.primary.main, 0.22),
                      color: theme.palette.primary.main,
                      fontWeight: 900,
                      fontSize: '0.95rem'
                    }}>
                    {recipientAddress ? recipientAddress.slice(-3).toUpperCase() : '---'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      onClick={() => {
                        if (!recipientAddress) return;
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard
                            .writeText(recipientAddress)
                            .then(() => {
                              setToast({ message: 'Address copied', severity: 'info' });
                            })
                            .catch(() => {
                              setToast({ message: 'Copy failed', severity: 'error' });
                            });
                        } else {
                          setToast({ message: 'Address copied', severity: 'info' });
                        }
                      }}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.25,
                        cursor: recipientAddress ? 'pointer' : 'default',
                        userSelect: 'none',
                        maxWidth: { xs: '100%', md: 520 },
                        overflow: 'hidden'
                      }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          lineHeight: 1.15,
                          fontSize: { xs: '0.95rem', md: '0.98rem' },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: recipientAddress ? 'inherit' : 'text.secondary',
                          fontFamily: 'monospace'
                        }}>
                        {displayRecipient || 'Select a miner to start'}
                      </Typography>
                      {recipientAddress && lastMessageRelative && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {lastMessageRelative}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                borderRadius: 0,
                backgroundColor: muiAlpha(theme.palette.background.paper, 0.76),
                p: { xs: 1, md: 1.25 },
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 8px 18px -14px rgba(0,0,0,0.9)'
                      : '0 10px 24px -18px rgba(60,45,120,0.28)'
                }}>
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    pb: { xs: 6, md: 7 },
                    pr: { xs: 0.5, md: 1 },
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: muiAlpha(theme.palette.text.primary, 0.2),
                      borderRadius: 999
                    }
                  }}
                  ref={messagesScrollRef}>
                  {recipientAddress ? (
                    hasMessagesForContact ? (
                      groupedMessages.map((group) => (
                        <Box key={group.dateKey} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              color: 'text.secondary',
                              fontSize: '0.8rem',
                              mx: 1
                            }}>
                            <Box
                              sx={{
                                flex: 1,
                                height: '1px',
                                backgroundImage: `linear-gradient(90deg, transparent, ${muiAlpha(
                                  theme.palette.primary.main,
                                  0.18
                                )}, transparent)`,
                                boxShadow: 'none'
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
                                )}, transparent)`,
                                boxShadow: 'none'
                              }}
                            />
                          </Box>
                          {group.items.map((msg) => {
                            const createdMs = (msg.created_at ?? 0) * 1000 || Date.now();
                            const shortTime = dayjs(createdMs).format('h:mm A');
                            const longTime = dayjs(createdMs).format('MMM D, YYYY h:mm:ss A');
                            return (
                              <Box
                                key={msg.id}
                                ref={msg.id === lastMessageId ? lastMessageRef : undefined}
                                sx={{
                                  alignSelf: 'flex-start',
                                  maxWidth: { xs: '92%', md: '76%' },
                                  minWidth: { xs: 180, sm: 220 },
                                  width: 'fit-content',
                                  borderRadius: 1.5,
                                  p: { xs: 1, md: 1.25 },
                                  backgroundColor: muiAlpha(theme.palette.primary.main, 0.08),
                                  boxShadow:
                                    theme.palette.mode === 'dark'
                                      ? '0 10px 28px -18px rgba(0,0,0,0.6)'
                                      : '0 12px 32px -20px rgba(60,45,120,0.25)',
                                  scrollMarginBottom: { xs: 110, md: 140 }
                                }}>
                                <MarkdownViewer
                                  key={msg.id}
                                  markdown={msg.content || ''}
                                  readOnly
                                  plugins={viewerPlugins}
                                  contentEditableClassName="mdxeditor-root-contenteditable"
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
                                  <Tooltip title={longTime}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      {shortTime}
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      ))
                    ) : hasAnyMessages ? (
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 160,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          color: 'text.secondary'
                        }}>
                        <Typography variant="body2">
                          No messages sent to this miner yet. Compose one below.
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 160,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          color: 'text.secondary'
                        }}>
                        <Typography variant="body2">No messages yet. Start a chat below.</Typography>
                      </Box>
                    )
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        color: 'text.secondary',
                        px: 2
                      }}>
                      <Typography variant="body2">
                        Select a miner or create a new one to start the pool chat.
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    position: 'relative',
                    mt: 1.25,
                    borderRadius: 2,
                    px: { xs: 1, md: 1.5 },
                    pb: { xs: 3.5, md: 4 },
                    backgroundColor: muiAlpha(theme.palette.background.default, 0.9)
                  }}>
                  <Box
                    onKeyDown={handleComposerKeyDown}
                    sx={{
                      borderRadius: 1.5,
                      backgroundColor: muiAlpha(theme.palette.background.paper, 0.98),
                      overflow: 'hidden',
                      '& .mdxeditor-toolbar': {
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: muiAlpha(theme.palette.background.paper, 0.98)
                      },
                      '& .mdxeditor-content': {
                        minHeight: 72,
                        maxHeight: 240,
                        overflowY: 'auto',
                        padding: '10px 12px'
                      }
                    }}>
                    <MarkdownEditor
                      key={`composer-${composeVersion}`}
                      ref={composeBodyRef}
                      markdown={composeBody}
                      onChange={(val: string) => {
                        if (sendSuccess) setSendSuccess(false);
                        setComposeBody(val);
                      }}
                      plugins={editorPlugins}
                      placeholder="Write a message..."
                      contentEditableClassName="mdxeditor-content"
                    />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<SendOutlinedIcon />}
                    disabled={!canSend}
                    onClick={handleComposeSend}
                    sx={{
                      position: 'absolute',
                      right: { xs: 10, md: 16 },
                      bottom: { xs: 8, md: 12 },
                      borderRadius: 999,
                      px: 2.25,
                      textTransform: 'none',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

// Hide global chrome for full-screen workspace
(PoolPage as any).hideChrome = true;

export default PoolPage;
