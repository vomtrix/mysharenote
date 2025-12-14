import {
  type TypedUseSelectorHook,
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector
} from 'react-redux';
import { createMigrate, persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import type { ThunkDispatch } from 'redux-thunk';
import { type Action, configureStore, type ThunkAction } from '@reduxjs/toolkit';
import { errorMiddleware } from '@middlewares/ErrorMiddleware';
import app, { initialState as appInitialState } from '@store/app/AppReducer';

const cloneSettings = (settings: any) => JSON.parse(JSON.stringify(settings));

// Snapshot of the previous default settings. When you update defaults, bump the version
// below and add a new snapshot so users who never changed settings get the new defaults
// while customized users keep their preferences.
const DEFAULT_SETTINGS_SNAPSHOT_V0 = cloneSettings(appInitialState.settings);

const areSettingsEqualToSnapshot = (settings: any, snapshot: any): boolean => {
  if (!settings || !snapshot) return false;
  const keys = new Set([...Object.keys(settings), ...Object.keys(snapshot)]);

  for (const key of keys) {
    const current = (settings as any)[key];
    const expected = (snapshot as any)[key];

    const bothObjects =
      current && expected && typeof current === 'object' && typeof expected === 'object';
    if (bothObjects) {
      if (!areSettingsEqualToSnapshot(current, expected)) return false;
      continue;
    }

    if (current !== expected) return false;
  }

  return true;
};

const migrations = {
  // Migration to apply new defaults only for users who never customized settings.
  1: (state: any) => {
    if (!state?.settings) return state;

    const userChangedSettings = !areSettingsEqualToSnapshot(
      state.settings,
      DEFAULT_SETTINGS_SNAPSHOT_V0
    );

    if (userChangedSettings) return state;

    return {
      ...state,
      // Deep clone to avoid mutating the source defaults in future writes
      settings: cloneSettings(appInitialState.settings)
    };
  }
};

const persistConfig = {
  key: 'shares',
  version: 2,
  storage,
  whitelist: ['address', 'settings', 'colorMode'],
  migrate: createMigrate(migrations, { debug: false })
};

const persistedReducer = persistReducer(persistConfig, app);

export const AppStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['register']
      }
    }).concat(errorMiddleware)
});

export type ReduxState = ReturnType<typeof AppStore.getState>;
export type ReduxDispatch = ThunkDispatch<ReduxState, unknown, Action>;

export const persistor = persistStore(AppStore);
export const useDispatch: () => ReduxDispatch = useReduxDispatch;
export const useSelector: TypedUseSelectorHook<ReduxState> = useReduxSelector;

/* Types */
export type ReduxStore = typeof AppStore;
export type ReduxThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  ReduxState,
  unknown,
  Action
>;
