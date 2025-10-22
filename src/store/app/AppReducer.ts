/* Core */
import { ICustomError } from '@interfaces/ICustomError';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { NetworkTypeType } from '@objects/Enums';
import { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { ISettings } from '@objects/interfaces/ISettings';
import { makeIdsSignature } from '@utils/Utils';
import { BlockStatusEnum, IShareEvent } from '@objects/interfaces/IShareEvent';
import {
  changeRelay,
  connectRelay,
  getHashrates,
  getLastBlockHeight,
  getPayouts,
  getShares,
  stopHashrates,
  stopShares,
  syncBlock
} from '@store/app/AppThunks';
import {
  DARK_MODE_DEFAULT,
  DARK_MODE_FORCE,
  EXPLORER_URL,
  PAYER_PUBLIC_KEY,
  RELAY_URL,
  WORK_PROVIDER_PUBLIC_KEY
} from 'src/config/config';

/* Instruments */

/* Types */
export interface AppState {
  address?: string;
  hashrates: IHashrateEvent[];
  shares: IShareEvent[];
  payouts: IPayoutEvent[];
  visibleSharesSig?: string | null;
  pendingBalance: number;
  unconfirmedBalance: number;
  settings: ISettings;
  colorMode: 'light' | 'dark';
  lastBlockHeight: number;
  isHashrateLoading: boolean;
  isSharesLoading: boolean;
  isSharesSyncLoading: boolean;
  isPayoutsLoading: boolean;
  skeleton: boolean;
  relayReady?: boolean;
  error?: ICustomError;
}

const initialColorMode: 'light' | 'dark' = DARK_MODE_FORCE ? 'dark' : DARK_MODE_DEFAULT;

export const initialState: AppState = {
  address: undefined,
  hashrates: [],
  shares: [],
  payouts: [],
  visibleSharesSig: null,
  unconfirmedBalance: 0,
  pendingBalance: 0,
  colorMode: initialColorMode,
  settings: {
    relay: RELAY_URL,
    network: NetworkTypeType.Mainnet,
    payerPublicKey: PAYER_PUBLIC_KEY,
    workProviderPublicKey: WORK_PROVIDER_PUBLIC_KEY,
    explorer: EXPLORER_URL
  },
  lastBlockHeight: 0,
  isHashrateLoading: false,
  isSharesSyncLoading: false,
  isSharesLoading: false,
  isPayoutsLoading: false,
  skeleton: false,
  relayReady: undefined,
  error: undefined
};

export const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    addAddress: (state: AppState, action: PayloadAction<any>) => {
      state.address = action.payload;
      state.skeleton = false;
    },
    clearAddress: (state: AppState) => {
      state.address = undefined;
      state.unconfirmedBalance = 0;
      state.pendingBalance = 0;
    },
    clearSettings: (state: AppState) => {
      state.settings = {
        relay: RELAY_URL,
        network: NetworkTypeType.Mainnet,
        payerPublicKey: PAYER_PUBLIC_KEY,
        workProviderPublicKey: WORK_PROVIDER_PUBLIC_KEY,
        explorer: EXPLORER_URL
      };
    },
    clearHashrates: (state: AppState) => {
      state.hashrates = [];
    },
    clearShares: (state: AppState) => {
      state.shares = [];
    },
    clearPayouts: (state: AppState) => {
      state.payouts = [];
    },
    setHashratesLoader: (state: AppState, action: PayloadAction<boolean>) => {
      state.isHashrateLoading = action.payload;
    },
    setShareLoader: (state: AppState, action: PayloadAction<boolean>) => {
      state.isSharesLoading = action.payload;
    },
    setPayoutLoader: (state: AppState, action: PayloadAction<boolean>) => {
      state.isPayoutsLoading = action.payload;
    },
    setSettings: (state: AppState, action: PayloadAction<ISettings>) => {
      state.settings = action.payload;
    },
    setColorMode: (state: AppState, action: PayloadAction<'light' | 'dark'>) => {
      state.colorMode = action.payload;
    },
    setSkeleton: (state: AppState, action: PayloadAction<boolean>) => {
      state.skeleton = action.payload;
    },
    setVisibleSharesSig: (state: AppState, action: PayloadAction<string | null>) => {
      state.visibleSharesSig = action.payload;
    },
    addPayout: (state: AppState, action: PayloadAction<IPayoutEvent>) => {
      const event = action.payload;
      const eventIndex = state.payouts.findIndex((payout) => payout.id === event.id);

      if (eventIndex != -1) {
        const oldEvent = state.payouts[eventIndex];
        if (!oldEvent.confirmedTx) state.unconfirmedBalance -= event.amount;
        state.payouts[eventIndex] = event;
      } else {
        if (!event.confirmedTx) state.unconfirmedBalance += event.amount;
        state.payouts = [...state.payouts, event];
      }
    },
    addShare: (state: AppState, action: PayloadAction<IShareEvent>) => {
      const event = action.payload;
      if (!state.lastBlockHeight || event.blockHeight > state.lastBlockHeight) {
        state.lastBlockHeight = event.blockHeight;
      }
      state.pendingBalance += event.amount;
      state.shares = [...state.shares, event];
    },
    updateShare: (
      state: AppState,
      action: PayloadAction<Partial<IShareEvent> & { id: string }>
    ) => {
      const payload = action.payload;
      const index = state.shares.findIndex((share) => share.id === payload.id);
      if (index !== -1) {
        state.shares[index] = { ...state.shares[index], ...payload };
        if (state.shares[index].status === BlockStatusEnum.Orphan) {
          state.pendingBalance -= state.shares[index].amount;
        }
      }
    },
    addHashrate: (state: AppState, action: PayloadAction<IHashrateEvent>) => {
      const event = action.payload;
      const lastHashrate = state.hashrates.at(-1)?.timestamp;
      if (event.timestamp !== lastHashrate) {
        state.hashrates = [...state.hashrates, event];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPayouts.pending, (state) => {
        state.payouts = [];
        state.isPayoutsLoading = true;
      })
      .addCase(getPayouts.rejected, (state, action) => {
        state.error = action.payload;
        state.isPayoutsLoading = false;
      })
      .addCase(getShares.pending, (state) => {
        state.shares = [];
        state.isSharesLoading = true;
      })
      .addCase(getShares.rejected, (state, action) => {
        state.error = action.payload;
        state.isSharesLoading = false;
      })
      .addCase(stopShares.pending, (state) => {
        state.error = undefined;
      })
      .addCase(stopShares.fulfilled, (state) => {
        state.shares = [];
      })
      .addCase(stopShares.rejected, (state, action) => {
        state.error = action.payload;
        state.isSharesLoading = false;
      })
      .addCase(getHashrates.pending, (state) => {
        state.hashrates = [];
        state.isHashrateLoading = true;
      })
      .addCase(getHashrates.rejected, (state, action) => {
        state.error = action.payload;
        state.isHashrateLoading = false;
      })
      .addCase(stopHashrates.pending, (state) => {
        state.error = undefined;
      })
      .addCase(stopHashrates.fulfilled, (state) => {
        state.hashrates = [];
      })
      .addCase(stopHashrates.rejected, (state, action) => {
        state.error = action.payload;
        state.isHashrateLoading = false;
      })
      .addCase(changeRelay.pending, (state) => {
        state.skeleton = true;
        state.error = undefined;
        state.relayReady = undefined;
        state.payouts = [];
        state.shares = [];
        state.hashrates = [];
      })
      .addCase(changeRelay.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.error = undefined;
        state.skeleton = false;
        state.relayReady = true;
      })
      .addCase(changeRelay.rejected, (state, action) => {
        state.error = action.payload;
        state.isPayoutsLoading = false;
        state.isSharesLoading = false;
        state.skeleton = true;
        state.relayReady = false;
      })
      .addCase(connectRelay.pending, (state) => {
        state.skeleton = true;
        state.error = undefined;
        state.payouts = [];
        state.relayReady = undefined;
      })
      .addCase(connectRelay.fulfilled, (state) => {
        state.error = undefined;
        state.relayReady = true;
        state.skeleton = false;
      })
      .addCase(connectRelay.rejected, (state, action) => {
        state.error = action.payload;
        state.isPayoutsLoading = false;
        state.isSharesLoading = false;
        state.skeleton = true;
        state.relayReady = false;
      })
      .addCase(syncBlock.pending, (state, action) => {
        try {
          const idsArg: any[] = action?.meta?.arg ?? [];
          const sig = makeIdsSignature(idsArg);
          if (sig !== state.visibleSharesSig) {
            state.isSharesSyncLoading = true;
          }
        } catch {
          state.isSharesSyncLoading = true;
        }
      })
      .addCase(syncBlock.fulfilled, (state) => {
        state.isSharesSyncLoading = false;
      })
      .addCase(syncBlock.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(getLastBlockHeight.fulfilled, (state, action) => {
        const blockHeight = action.payload;
        if (!state.lastBlockHeight || blockHeight > state.lastBlockHeight) {
          state.lastBlockHeight = blockHeight;
        }
      });
  }
});

const { reducer: appReducer } = slice;

export const {
  addHashrate,
  addPayout,
  addShare,
  updateShare,
  addAddress,
  clearSettings,
  clearAddress,
  clearPayouts,
  clearShares,
  clearHashrates,
  setHashratesLoader,
  setPayoutLoader,
  setShareLoader,
  setSettings,
  setColorMode,
  setSkeleton,
  setVisibleSharesSig
} = slice.actions;

export default appReducer;
