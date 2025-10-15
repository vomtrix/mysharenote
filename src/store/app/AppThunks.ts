import { Container } from 'typedi';
import { ISettings } from '@objects/interfaces/ISettings';
import { BlockStatusEnum } from '@objects/interfaces/IShareEvent';
import { ElectrumService } from '@services/api/ElectrumService';
import { RelayService } from '@services/api/RelayService';
import { createAppAsyncThunk } from '@store/createAppAsyncThunk';
import { beautify } from '@utils/beautifierUtils';
import { makeIdsSignature } from '@utils/Utils';
import {
  addHashrate,
  addPayout,
  addShare,
  setHashratesLoader,
  setPayoutLoader,
  setShareLoader,
  setSkeleton,
  updateShare,
  setVisibleSharesSig
} from './AppReducer';

export const getPayouts = createAppAsyncThunk(
  'relay/getPayouts',
  async (address: string, { rejectWithValue, dispatch, getState }) => {
    try {
      const { settings } = getState();
      const relayService: any = Container.get(RelayService);
      let timeoutId: NodeJS.Timeout | undefined;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(setPayoutLoader(false));
        }, 2000);
      };

      relayService.subscribePayouts(address, settings.payerPublicKey, {
        onevent: (event: any) => {
          const payoutEvent = beautify(event);
          dispatch(addPayout(payoutEvent));
          resetTimeout();
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
      const { shares, visibleSharesSig } = getState();
      const sig = makeIdsSignature(ids ?? []);
      if (sig === visibleSharesSig) return;

      dispatch(setVisibleSharesSig(sig));
      const idSet = new Set(ids ?? []);
      const sharesToSync = shares
        .filter((share: any) => idSet.has(share.id))
        .filter((share: any) =>
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
      let timeoutId: NodeJS.Timeout | undefined;
      let sharesCount = 0;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(setShareLoader(false));
        }, 2000);
      };

      relayService.subscribeShares(address, settings.workProviderPublicKey, {
        onevent: (event: any) => {
          const shareEvent = beautify(event);
          dispatch(addShare({ ...shareEvent, status: BlockStatusEnum.New }));
          sharesCount++;
          resetTimeout();
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
      let timeoutId: NodeJS.Timeout | undefined;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(setHashratesLoader(false));
        }, 2000);
      };

      relayService.subscribeHashrates(address, settings.workProviderPublicKey, {
        onevent: (event: any) => {
          const hashrateEvent = beautify(event);
          dispatch(addHashrate(hashrateEvent));
          resetTimeout();
        },
        oneose: () => {
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
