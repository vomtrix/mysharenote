import { Container } from 'typedi';
import { IDirectMessageEvent } from '@objects/interfaces/IDirectMessageEvent';
import { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import type { ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { ISettings } from '@objects/interfaces/ISettings';
import { IShareEvent } from '@objects/interfaces/IShareEvent';
import { RelayService } from '@services/api/RelayService';
import { createAppAsyncThunk } from '@store/createAppAsyncThunk';
import { beautify } from '@utils/beautifierUtils';
import { toHexPublicKey } from '@utils/nostr';
import {
  addHashratesBatch,
  addLiveSharenotesBatch,
  addPayoutsBatch,
  addSharesBatch,
  addDirectMessagesBatch,
  markLiveSharenotesEose,
  setHashratesLoader,
  setLiveSharenotesLoader,
  setPayoutLoader,
  setShareLoader,
  setDirectMessagesLoader,
  setSkeleton
} from './AppReducer';

const BATCH_FLUSH_DEBOUNCE_MS = 750;

export const getPayouts = createAppAsyncThunk(
  'relay/getPayouts',
  async (address: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      const payerPublicKeyHex = toHexPublicKey(settings.payerPublicKey);
      let timeoutId: NodeJS.Timeout | undefined;
      const payoutBuffer: IPayoutEvent[] = [];
      let flushHandle: NodeJS.Timeout | undefined;

      const flushPayouts = () => {
        if (!payoutBuffer.length) return;
        const batch = payoutBuffer.splice(0, payoutBuffer.length);
        dispatch(addPayoutsBatch(batch));
        if (flushHandle) {
          clearTimeout(flushHandle);
          flushHandle = undefined;
        }
      };

      const scheduleFlush = () => {
        if (flushHandle) clearTimeout(flushHandle);
        flushHandle = setTimeout(() => {
          flushHandle = undefined;
          flushPayouts();
        }, BATCH_FLUSH_DEBOUNCE_MS);
      };

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        dispatch(setPayoutLoader(true));
        timeoutId = setTimeout(() => {
          dispatch(setPayoutLoader(false));
        }, 5000);
      };

      relayService.subscribePayouts(address, payerPublicKeyHex, {
        onevent: (event: any) => {
          payoutBuffer.push(beautify(event) as IPayoutEvent);
          scheduleFlush();
          resetTimeout();
        },
        oneose: () => {
          flushPayouts();
          if (timeoutId) clearTimeout(timeoutId);
          dispatch(setPayoutLoader(false));
        }
      });

      resetTimeout();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const getShares = createAppAsyncThunk(
  'relay/getShares',
  async (address: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      const workProviderPublicKeyHex = toHexPublicKey(settings.workProviderPublicKey);
      let timeoutId: NodeJS.Timeout | undefined;
      const shareBuffer: IShareEvent[] = [];
      let flushHandle: NodeJS.Timeout | undefined;

      const flushShares = () => {
        if (!shareBuffer.length) return;
        const batch = shareBuffer.splice(0, shareBuffer.length);
        dispatch(addSharesBatch(batch));
        if (flushHandle) {
          clearTimeout(flushHandle);
          flushHandle = undefined;
        }
      };

      const scheduleFlush = () => {
        if (flushHandle) clearTimeout(flushHandle);
        flushHandle = setTimeout(() => {
          flushHandle = undefined;
          flushShares();
        }, BATCH_FLUSH_DEBOUNCE_MS);
      };

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(setShareLoader(false));
        }, 5000);
      };

      relayService.subscribeShares(address, workProviderPublicKeyHex, {
        onevent: (event: any) => {
          const shareEvent = beautify(event) as IShareEvent;
          shareBuffer.push(shareEvent);
          scheduleFlush();
          resetTimeout();
        },
        oneose: () => {
          flushShares();
          if (timeoutId) clearTimeout(timeoutId);
          dispatch(setShareLoader(false));
        }
      });

      resetTimeout();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const getLiveSharenotes = createAppAsyncThunk(
  'relay/getLiveSharenotes',
  async (address: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      const workProviderPublicKeyHex = toHexPublicKey(settings.workProviderPublicKey);
      let timeoutId: NodeJS.Timeout | undefined;
      const liveBuffer: ILiveSharenoteEvent[] = [];
      let flushHandle: NodeJS.Timeout | undefined;
      let hasLoaded = false;

      const flushLive = () => {
        if (!liveBuffer.length) return;
        const batch = liveBuffer.splice(0, liveBuffer.length);
        dispatch(addLiveSharenotesBatch(batch));
        if (!hasLoaded) {
          hasLoaded = true;
          dispatch(setLiveSharenotesLoader(false));
        }
        if (flushHandle) {
          clearTimeout(flushHandle);
          flushHandle = undefined;
        }
      };

      const scheduleFlush = () => {
        if (flushHandle) clearTimeout(flushHandle);
        flushHandle = setTimeout(() => {
          flushHandle = undefined;
          flushLive();
        }, BATCH_FLUSH_DEBOUNCE_MS);
      };

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!hasLoaded) {
            hasLoaded = true;
            dispatch(setLiveSharenotesLoader(false));
          }
        }, 5000);
      };

      relayService.subscribeLiveSharenotes(address, workProviderPublicKeyHex, {
        onevent: (event: any) => {
          const liveEvent = beautify(event) as ILiveSharenoteEvent;
          liveBuffer.push(liveEvent);
          scheduleFlush();
          resetTimeout();
        },
        oneose: () => {
          flushLive();
          dispatch(markLiveSharenotesEose());
          if (timeoutId) clearTimeout(timeoutId);
          if (!hasLoaded) {
            hasLoaded = true;
            dispatch(setLiveSharenotesLoader(false));
          }
        }
      });

      resetTimeout();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const getDirectMessages = createAppAsyncThunk(
  'relay/getDirectMessages',
  async (address: string | undefined, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      const workProviderPublicKeyHex = toHexPublicKey(settings.workProviderPublicKey);
      let timeoutId: NodeJS.Timeout | undefined;
      const buffer: IDirectMessageEvent[] = [];
      let flushHandle: NodeJS.Timeout | undefined;
      let hasLoaded = false;

      const flush = () => {
        if (!buffer.length) return;
        const batch = buffer.splice(0, buffer.length);
        dispatch(addDirectMessagesBatch(batch));
        if (!hasLoaded) {
          hasLoaded = true;
          dispatch(setDirectMessagesLoader(false));
        }
        if (flushHandle) {
          clearTimeout(flushHandle);
          flushHandle = undefined;
        }
      };

      const scheduleFlush = () => {
        if (flushHandle) clearTimeout(flushHandle);
        flushHandle = setTimeout(() => {
          flushHandle = undefined;
          flush();
        }, BATCH_FLUSH_DEBOUNCE_MS);
      };

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!hasLoaded) {
            hasLoaded = true;
            dispatch(setDirectMessagesLoader(false));
          }
        }, 5000);
      };

      relayService.subscribeDirectMessages(workProviderPublicKeyHex, {
        onevent: (event: any) => {
          const taggedAddress =
            Array.isArray(event.tags) &&
            event.tags
              .find((tag: any) => Array.isArray(tag) && tag[0] === 'a' && typeof tag[1] === 'string')
              ?.[1];
          const normalized: IDirectMessageEvent = {
            id: event.id,
            content: event.content ?? '',
            tags: Array.isArray(event.tags) ? event.tags : [],
            created_at: event.created_at,
            timestamp: event.created_at,
            pubkey: event.pubkey,
            kind: event.kind,
            address: taggedAddress || address
          };
          buffer.push(normalized);
          scheduleFlush();
          resetTimeout();
        },
        oneose: () => {
          flush();
          if (timeoutId) clearTimeout(timeoutId);
          if (!hasLoaded) {
            hasLoaded = true;
            dispatch(setDirectMessagesLoader(false));
          }
        }
      }, address);

      resetTimeout();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const stopLiveSharenotes = createAppAsyncThunk(
  'relay/stopLiveSharenotes',
  async (_, { rejectWithValue }) => {
    try {
      const relayService: any = Container.get(RelayService);
      await relayService.stopLiveSharenotes();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const stopDirectMessages = createAppAsyncThunk(
  'relay/stopDirectMessages',
  async (_, { rejectWithValue }) => {
    try {
      const relayService: any = Container.get(RelayService);
      await relayService.stopDirectMessages();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const getHashrates = createAppAsyncThunk(
  'relay/getHashrates',
  async (address: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      const workProviderPublicKeyHex = toHexPublicKey(settings.workProviderPublicKey);
      let timeoutId: NodeJS.Timeout | undefined;
      const hashrateBuffer: IHashrateEvent[] = [];
      let flushHandle: NodeJS.Timeout | undefined;

      const flushHashrates = () => {
        if (!hashrateBuffer.length) return;
        const batch = hashrateBuffer.splice(0, hashrateBuffer.length);
        dispatch(addHashratesBatch(batch));
        if (flushHandle) {
          clearTimeout(flushHandle);
          flushHandle = undefined;
        }
      };

      const scheduleFlush = () => {
        if (flushHandle) clearTimeout(flushHandle);
        flushHandle = setTimeout(() => {
          flushHandle = undefined;
          flushHashrates();
        }, BATCH_FLUSH_DEBOUNCE_MS);
      };

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(setHashratesLoader(false));
        }, 2000);
      };

      relayService.subscribeHashrates(address, workProviderPublicKeyHex, {
        onevent: (event: any) => {
          hashrateBuffer.push(beautify(event) as IHashrateEvent);
          scheduleFlush();
          resetTimeout();
        },
        oneose: () => {
          flushHashrates();
          if (timeoutId) clearTimeout(timeoutId);
          dispatch(setHashratesLoader(false));
        }
      });

      resetTimeout();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const stopPayouts = createAppAsyncThunk(
  'relay/stopPayouts',
  async (_, { rejectWithValue }) => {
    try {
      const relayService: any = Container.get(RelayService);
      relayService.stopPayouts();
      return;
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const stopShares = createAppAsyncThunk(
  'relay/stopShares',
  async (_, { rejectWithValue }) => {
    try {
      const relayService: any = Container.get(RelayService);
      relayService.stopShares();
      return;
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const stopHashrates = createAppAsyncThunk(
  'relay/stopHashrate',
  async (_, { rejectWithValue }) => {
    try {
      const relayService: any = Container.get(RelayService);
      relayService.stopHashrates();
      return;
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const connectRelay = createAppAsyncThunk(
  'relay/connectRelay',
  async (relayUrl: string, { rejectWithValue, dispatch }) => {
    try {
      const relayService: any = Container.get(RelayService);
      await relayService.connectRelay(relayUrl);
    } catch (err: any) {
      dispatch(setSkeleton(true));
      return rejectWithValue({
        message: err?.message || err,
        code: err.code,
        status: err.status
      });
    }
  }
);

export const changeRelay = createAppAsyncThunk(
  'relay/changeRelay',
  async (settings: ISettings, { rejectWithValue, dispatch }) => {
    try {
      const relayService: any = Container.get(RelayService);
      await relayService.connectRelay(settings.relay);
      return settings;
    } catch (err: any) {
      dispatch(setSkeleton(true));
      return rejectWithValue({
        message: err?.message || err,
        code: err.code,
        status: err.status
      });
    }
  }
);
