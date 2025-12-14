/* Core */
import { ICustomError } from '@interfaces/ICustomError';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { noteFromZBits, parseNoteLabel } from '@soprinter/sharenotejs';
import { IDirectMessageEvent } from '@objects/interfaces/IDirectMessageEvent';
import { IHashrateEvent } from '@objects/interfaces/IHashrateEvent';
import type { ILiveSharenoteEvent } from '@objects/interfaces/ILiveSharenoteEvent';
import { IPayoutEvent } from '@objects/interfaces/IPayoutEvent';
import { ISettings } from '@objects/interfaces/ISettings';
import { IShareEvent } from '@objects/interfaces/IShareEvent';
import {
  changeRelay,
  connectRelay,
  getDirectMessages,
  getHashrates,
  getLiveSharenotes,
  getPayouts,
  getShares,
  stopDirectMessages,
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
  liveSharenotesEoseIndex: number | null;
  directMessages: IDirectMessageEvent[];
  directMessagesLastOpenedAt: number | null;
  pendingBalance: number;
  unconfirmedBalance: number;
  settings: ISettings;
  settingsUserModified: boolean;
  settingsVersionApplied: number;
  colorMode: 'light' | 'dark';
  isHashrateLoading: boolean;
  isSharesLoading: boolean;
  isPayoutsLoading: boolean;
  isDirectMessagesLoading: boolean;
  skeleton: boolean;
  relayReady?: boolean;
  error?: ICustomError;
  isLiveSharenotesLoading: boolean;
}

// Increment when default settings change (e.g., new env-based defaults).
export const SETTINGS_DEFAULT_VERSION = 2;

const initialColorMode: 'light' | 'dark' = DARK_MODE_FORCE ? 'dark' : DARK_MODE_DEFAULT;

export const initialState: AppState = {
  address: undefined,
  hashrates: [],
  shares: [],
  payouts: [],
  liveSharenotes: [],
  liveSharenotesEoseIndex: null,
  directMessages: [],
  directMessagesLastOpenedAt: null,
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
  settingsUserModified: false,
  settingsVersionApplied: SETTINGS_DEFAULT_VERSION,
  isHashrateLoading: false,
  isSharesLoading: false,
  isPayoutsLoading: false,
  isDirectMessagesLoading: false,
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
  const existingIndex = state.shares.findIndex((share) => share.id === event.id);
  const newAmount = Number(event.amount) || 0;

  if (existingIndex !== -1) {
    const previousAmount = Number(state.shares[existingIndex]?.amount) || 0;
    state.pendingBalance += newAmount - previousAmount;
    state.shares[existingIndex] = event;
    return;
  }

  state.pendingBalance += newAmount;
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
    const shareCountSort =
      typeof detail.shareCount === 'number' && Number.isFinite(detail.shareCount)
        ? detail.shareCount
        : -Infinity;
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
      shareCountSort,
      lastShareMsSort: toMs(detail.lastShareTimestamp),
      originalIndex: index
    };
  });

  entries.sort((a, b) => {
    if (a.sharenoteZBitsSort !== b.sharenoteZBitsSort) {
      return b.sharenoteZBitsSort - a.sharenoteZBitsSort;
    }
    if (a.shareCountSort !== b.shareCountSort) {
      return b.shareCountSort - a.shareCountSort;
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

const applyDirectMessageEvent = (state: AppState, event: IDirectMessageEvent) => {
  if (!event?.id) return;
  const existingIndex = state.directMessages.findIndex((dm) => dm.id === event.id);
  if (existingIndex !== -1) {
    state.directMessages[existingIndex] = event;
    return;
  }

  state.directMessages.unshift(event);
  state.directMessages.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
};

export const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    addAddress: (state: AppState, action: PayloadAction<any>) => {
      state.address = action.payload;
      state.skeleton = false;
      state.directMessages = [];
      state.isDirectMessagesLoading = false;
      state.directMessagesLastOpenedAt = null;
    },
    clearAddress: (state: AppState) => {
      state.address = undefined;
      state.unconfirmedBalance = 0;
      state.pendingBalance = 0;
      state.directMessages = [];
      state.isDirectMessagesLoading = false;
      state.directMessagesLastOpenedAt = null;
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
      state.settingsUserModified = false;
      state.settingsVersionApplied = SETTINGS_DEFAULT_VERSION;
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
      state.liveSharenotesEoseIndex = null;
    },
    clearDirectMessages: (state: AppState) => {
      state.directMessages = [];
      state.isDirectMessagesLoading = false;
      state.directMessagesLastOpenedAt = null;
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
    setDirectMessagesLoader: (state: AppState, action: PayloadAction<boolean>) => {
      state.isDirectMessagesLoading = action.payload;
    },
    setDirectMessagesLastOpened: (state: AppState, action: PayloadAction<number | null>) => {
      const value = action.payload;
      state.directMessagesLastOpenedAt =
        typeof value === 'number' && Number.isFinite(value) ? value : null;
    },
    setSettings: (state: AppState, action: PayloadAction<ISettings>) => {
      state.settings = action.payload;
      state.settingsUserModified = true;
      state.settingsVersionApplied = SETTINGS_DEFAULT_VERSION;
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
    markLiveSharenotesEose: (state: AppState) => {
      state.liveSharenotesEoseIndex = state.liveSharenotes.length;
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
    },
    addDirectMessage: (state: AppState, action: PayloadAction<IDirectMessageEvent>) => {
      applyDirectMessageEvent(state, action.payload);
    },
    addDirectMessagesBatch: (state: AppState, action: PayloadAction<IDirectMessageEvent[]>) => {
      action.payload.forEach((event) => applyDirectMessageEvent(state, event));
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
        state.liveSharenotesEoseIndex = null;
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
        state.liveSharenotesEoseIndex = null;
        state.isLiveSharenotesLoading = false;
      })
      .addCase(stopLiveSharenotes.rejected, (state, action) => {
        state.error = action.payload;
        state.isLiveSharenotesLoading = false;
        state.liveSharenotesEoseIndex = null;
      })
      .addCase(getDirectMessages.pending, (state) => {
        state.directMessages = [];
        state.isDirectMessagesLoading = true;
      })
      .addCase(getDirectMessages.rejected, (state, action) => {
        state.error = action.payload;
        state.isDirectMessagesLoading = false;
      })
      .addCase(stopDirectMessages.pending, (state) => {
        state.error = undefined;
      })
      .addCase(stopDirectMessages.fulfilled, (state) => {
        state.directMessages = [];
        state.isDirectMessagesLoading = false;
      })
      .addCase(stopDirectMessages.rejected, (state, action) => {
        state.error = action.payload;
        state.isDirectMessagesLoading = false;
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
        state.directMessages = [];
        state.isDirectMessagesLoading = false;
        state.directMessagesLastOpenedAt = null;
      })
      .addCase(changeRelay.fulfilled, (state, action) => {
        const payload = action.payload;
        state.settings = {
          ...state.settings,
          ...payload,
          explorers: { ...DEFAULT_CHAIN_EXPLORERS, ...(payload?.explorers ?? {}) }
        };
        state.settingsUserModified = true;
        state.settingsVersionApplied = SETTINGS_DEFAULT_VERSION;
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
        state.directMessages = [];
        state.isDirectMessagesLoading = false;
        state.directMessagesLastOpenedAt = null;
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
  addDirectMessage,
  addDirectMessagesBatch,
  addAddress,
  clearSettings,
  clearAddress,
  clearPayouts,
  clearShares,
  clearDirectMessages,
  clearLiveSharenotes,
  clearHashrates,
  markLiveSharenotesEose,
  setHashratesLoader,
  setPayoutLoader,
  setShareLoader,
  setDirectMessagesLoader,
  setDirectMessagesLastOpened,
  setLiveSharenotesLoader,
  setSettings,
  setColorMode,
  setSkeleton
} = slice.actions;

export default appReducer;
