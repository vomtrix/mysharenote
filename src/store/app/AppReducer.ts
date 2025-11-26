/* Core */
import { ICustomError } from '@interfaces/ICustomError';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { noteFromZBits, parseNoteLabel } from '@soprinter/sharenotejs';
import { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import type { ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { ISettings } from '@objects/interfaces/ISettings';
import { IShareEvent } from '@objects/interfaces/IShareEvent';
import {
  changeRelay,
  connectRelay,
  getHashrates,
  getLastBlockHeight,
  getLiveSharenotes,
  getPayouts,
  getShares,
  stopHashrates,
  stopLiveSharenotes,
  stopShares
} from '@store/app/AppThunks';
import {
  DARK_MODE_DEFAULT,
  DARK_MODE_FORCE,
  DEFAULT_CHAIN_EXPLORERS,
  DEFAULT_NETWORK,
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
  liveSharenotes: ILiveSharenoteEvent[];
  pendingBalance: number;
  unconfirmedBalance: number;
  settings: ISettings;
  colorMode: 'light' | 'dark';
  lastBlockHeight: number;
  isHashrateLoading: boolean;
  isSharesLoading: boolean;
  isPayoutsLoading: boolean;
  skeleton: boolean;
  relayReady?: boolean;
  error?: ICustomError;
  isLiveSharenotesLoading: boolean;
}

const initialColorMode: 'light' | 'dark' = DARK_MODE_FORCE ? 'dark' : DARK_MODE_DEFAULT;

export const initialState: AppState = {
  address: undefined,
  hashrates: [],
  shares: [],
  payouts: [],
  liveSharenotes: [],
  unconfirmedBalance: 0,
  pendingBalance: 0,
  colorMode: initialColorMode,
  settings: {
    relay: RELAY_URL,
    network: DEFAULT_NETWORK,
    payerPublicKey: PAYER_PUBLIC_KEY,
    workProviderPublicKey: WORK_PROVIDER_PUBLIC_KEY,
    explorer: EXPLORER_URL,
    explorers: { ...DEFAULT_CHAIN_EXPLORERS }
  },
  lastBlockHeight: 0,
  isHashrateLoading: false,
  isSharesLoading: false,
  isPayoutsLoading: false,
  skeleton: false,
  relayReady: undefined,
  error: undefined,
  isLiveSharenotesLoading: false
};

const applyPayoutEvent = (state: AppState, event: IPayoutEvent) => {
  const eventIndex = state.payouts.findIndex((payout) => payout.id === event.id);

  if (eventIndex !== -1) {
    const oldEvent = state.payouts[eventIndex];
    if (!oldEvent.confirmedTx) state.unconfirmedBalance -= event.amount;
    state.payouts[eventIndex] = event;
  } else {
    if (!event.confirmedTx) state.unconfirmedBalance += event.amount;
    state.payouts.push(event);
  }
};

const applyShareEvent = (state: AppState, event: IShareEvent) => {
  if (!state.lastBlockHeight || event.blockHeight > state.lastBlockHeight) {
    state.lastBlockHeight = event.blockHeight;
  }
  state.pendingBalance += event.amount;
  state.shares.push(event);
};

const normalizeWorkerNotes = (event: IHashrateEvent) => {
  if (!event.workerDetails) return;
  const toMs = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return value > 1e12 ? value : value * 1000;
  };
  const toZBits = (value: unknown): number | undefined => {
    if (value === undefined || value === null) return undefined;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') return undefined;

    if (typeof normalized === 'string') {
      try {
        const note = parseNoteLabel(normalized);
        if (note && Number.isFinite(note.zBits)) return note.zBits;
      } catch {
        /* ignore parse errors */
      }
    }

    const numericValue = Number(normalized as any);
    if (!Number.isFinite(numericValue)) return undefined;
    try {
      const note = noteFromZBits(numericValue);
      if (note && Number.isFinite(note.zBits)) return note.zBits;
    } catch {
      /* ignore conversion errors */
    }
    return numericValue;
  };

  const entries = Object.entries(event.workerDetails).map(([workerId, detail], index) => {
    if (detail.sharenoteZBits === undefined) {
      const rawSharenote =
        typeof detail.sharenote === 'string' ? detail.sharenote.trim() : detail.sharenote;
      const zBitsValue = toZBits(rawSharenote);
      if (zBitsValue !== undefined) {
        detail.sharenoteZBits = zBitsValue;
      }
    }

    if (detail.meanSharenoteZBits === undefined) {
      const rawMean =
        typeof detail.meanSharenote === 'string'
          ? detail.meanSharenote.trim()
          : detail.meanSharenote;
      if (rawMean !== undefined && rawMean !== null && rawMean !== '') {
        const numericValue = Number(rawMean);
        if (Number.isFinite(numericValue)) {
          detail.meanSharenoteZBits = numericValue;
        }
      }
    }

    return {
      workerId,
      detail,
      sharenoteZBitsSort: Number.isFinite(detail.sharenoteZBits)
        ? (detail.sharenoteZBits as number)
        : -Infinity,
      lastShareMsSort: toMs(detail.lastShareTimestamp),
      originalIndex: index
    };
  });

  entries.sort((a, b) => {
    if (a.sharenoteZBitsSort !== b.sharenoteZBitsSort) {
      return b.sharenoteZBitsSort - a.sharenoteZBitsSort;
    }
    const lastA = a.lastShareMsSort ?? -Infinity;
    const lastB = b.lastShareMsSort ?? -Infinity;
    if (lastA !== lastB) return lastB - lastA;
    return a.originalIndex - b.originalIndex;
  });

  event.workerDetails = Object.fromEntries(
    entries.map(({ workerId, detail }) => [workerId, detail])
  );
};

const applyHashrateEvent = (state: AppState, event: IHashrateEvent) => {
  const lastHashrate = state.hashrates.at(-1)?.timestamp;
  if (event.timestamp !== lastHashrate) {
    normalizeWorkerNotes(event);
    state.hashrates.push(event);
  }
};

const applyLiveSharenoteEvent = (state: AppState, event: ILiveSharenoteEvent) => {
  state.liveSharenotes.push(event);
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
        network: DEFAULT_NETWORK,
        payerPublicKey: PAYER_PUBLIC_KEY,
        workProviderPublicKey: WORK_PROVIDER_PUBLIC_KEY,
        explorer: EXPLORER_URL,
        explorers: { ...DEFAULT_CHAIN_EXPLORERS }
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
    clearLiveSharenotes: (state: AppState) => {
      state.liveSharenotes = [];
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
    setLiveSharenotesLoader: (state: AppState, action: PayloadAction<boolean>) => {
      state.isLiveSharenotesLoading = action.payload;
    },
    addPayout: (state: AppState, action: PayloadAction<IPayoutEvent>) => {
      applyPayoutEvent(state, action.payload);
    },
    addPayoutsBatch: (state: AppState, action: PayloadAction<IPayoutEvent[]>) => {
      action.payload.forEach((event) => applyPayoutEvent(state, event));
    },
    addShare: (state: AppState, action: PayloadAction<IShareEvent>) => {
      applyShareEvent(state, action.payload);
    },
    addSharesBatch: (state: AppState, action: PayloadAction<IShareEvent[]>) => {
      action.payload.forEach((event) => applyShareEvent(state, event));
    },
    addHashrate: (state: AppState, action: PayloadAction<IHashrateEvent>) => {
      applyHashrateEvent(state, action.payload);
    },
    addHashratesBatch: (state: AppState, action: PayloadAction<IHashrateEvent[]>) => {
      action.payload.forEach((event) => applyHashrateEvent(state, event));
    },
    addLiveSharenote: (state: AppState, action: PayloadAction<ILiveSharenoteEvent>) => {
      applyLiveSharenoteEvent(state, action.payload);
    },
    addLiveSharenotesBatch: (state: AppState, action: PayloadAction<ILiveSharenoteEvent[]>) => {
      action.payload.forEach((event) => applyLiveSharenoteEvent(state, event));
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
      .addCase(getLiveSharenotes.pending, (state) => {
        state.liveSharenotes = [];
        state.isLiveSharenotesLoading = true;
      })
      .addCase(getLiveSharenotes.rejected, (state, action) => {
        state.error = action.payload;
        state.isLiveSharenotesLoading = false;
      })
      .addCase(stopLiveSharenotes.pending, (state) => {
        state.error = undefined;
      })
      .addCase(stopLiveSharenotes.fulfilled, (state) => {
        state.liveSharenotes = [];
        state.isLiveSharenotesLoading = false;
      })
      .addCase(stopLiveSharenotes.rejected, (state, action) => {
        state.error = action.payload;
        state.isLiveSharenotesLoading = false;
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
        const payload = action.payload;
        state.settings = {
          ...state.settings,
          ...payload,
          explorers: { ...DEFAULT_CHAIN_EXPLORERS, ...(payload?.explorers ?? {}) }
        };
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
  addHashratesBatch,
  addPayout,
  addPayoutsBatch,
  addShare,
  addSharesBatch,
  addLiveSharenote,
  addLiveSharenotesBatch,
  addAddress,
  clearSettings,
  clearAddress,
  clearPayouts,
  clearShares,
  clearLiveSharenotes,
  clearHashrates,
  setHashratesLoader,
  setPayoutLoader,
  setShareLoader,
  setLiveSharenotesLoader,
  setSettings,
  setColorMode,
  setSkeleton
} = slice.actions;

export default appReducer;
