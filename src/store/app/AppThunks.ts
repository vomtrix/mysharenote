import { Container } from 'typedi';
import { ORHAN_BLOCK_MATURITY } from '@config/config';
import { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { ISettings } from '@objects/interfaces/ISettings';
import { BlockStatusEnum, IShareEvent } from '@objects/interfaces/IShareEvent';
import { ElectrumService } from '@services/api/ElectrumService';
import { RelayService } from '@services/api/RelayService';
import { createAppAsyncThunk } from '@store/createAppAsyncThunk';
import { beautify } from '@utils/beautifierUtils';
import { makeIdsSignature } from '@utils/helpers';
import { toHexPublicKey } from '@utils/nostr';
import {
  addHashratesBatch,
  addPayoutsBatch,
  addSharesBatch,
  setHashratesLoader,
  setPayoutLoader,
  setShareLoader,
  setSkeleton,
  setVisibleSharesSig,
  updateShare
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

export const syncBlock = createAppAsyncThunk(
  'electrum/syncBlock',
  async (ids: any[], { rejectWithValue, dispatch, getState }) => {
    try {
      const { shares, visibleSharesSig, lastBlockHeight } = getState();
      const sig = makeIdsSignature(ids ?? []);
      if (sig === visibleSharesSig) return;

      dispatch(setVisibleSharesSig(sig));
      const idSet = new Set(ids ?? []);
      const orphanBlockHeightMaturity = lastBlockHeight - ORHAN_BLOCK_MATURITY;
      const sharesToSync = shares.filter(
        (share: any) =>
          idSet.has(share.id) &&
          share.blockHeight <= orphanBlockHeightMaturity &&
          [BlockStatusEnum.New, BlockStatusEnum.Checked].includes(share.status)
      );

      const electrumService: any = Container.get(ElectrumService);
      const results = await Promise.allSettled(
        sharesToSync.map((share) => electrumService.getBlock(share.blockHash))
      );

      results.forEach(({ status, value, reason }: any, index: number) => {
        const targetShare = sharesToSync[index];
        if (!targetShare) return;

        if (status === 'rejected' && reason?.message === 'Failed to get block') {
          dispatch(updateShare({ id: targetShare.id, status: BlockStatusEnum.Orphan }));
        } else if (status === 'fulfilled' && value?.id) {
          dispatch(updateShare({ id: targetShare.id, status: BlockStatusEnum.Valid }));
        } else {
          dispatch(updateShare({ id: targetShare.id, status: BlockStatusEnum.Checked }));
        }
      });
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message || err,
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
          shareBuffer.push({ ...shareEvent, status: BlockStatusEnum.New });
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

export const getLastBlockHeight = createAppAsyncThunk(
  'electrum/getLastBlockHeight',
  async (_, { rejectWithValue }) => {
    try {
      const electrumService: any = Container.get(ElectrumService);
      return await electrumService.getLastBlockHeight();
    } catch (err: any) {
      return rejectWithValue({
        message: err?.message || err,
        code: err.code,
        status: err.status
      });
    }
  }
);
