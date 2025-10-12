/* Instruments */
import type { ReduxState } from '@store/store';

export const getAddress = (state: ReduxState) => state.address;
export const getUnconfirmedBalance = (state: ReduxState) => state.unconfirmedBalance;
export const getPendingBalance = (state: ReduxState) => state.pendingBalance;
export const getSettings = (state: ReduxState) => state.settings;

export const getPayouts = (state: ReduxState) => state.payouts;
export const getHashrates = (state: ReduxState) => state.hashrates;
export const getShares = (state: ReduxState) => state.shares;

export const getHashratesCount = (state: ReduxState) => state.shares.length;
export const getSharesCount = (state: ReduxState) => state.shares.length;
export const getPayoutsCount = (state: ReduxState) => state.payouts.length;

export const getIsHashratesLoading = (state: ReduxState) => state.isHashrateLoading;
export const getIsSharesLoading = (state: ReduxState) => state.isSharesLoading;
export const getIsPayoutsLoading = (state: ReduxState) => state.isPayoutsLoading;
export const getSkeleton = (state: ReduxState) => state.skeleton;
export const getError = (state: ReduxState) => state.error;
export const getRelayReady = (state: ReduxState) => state.relayReady;
export const getColorMode = (state: ReduxState) => state.colorMode;
export const getSharesSyncLoading = (state: ReduxState) => state.isSharesSyncLoading;
