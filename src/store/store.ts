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
import type { MigrationManifest } from 'redux-persist';

const cloneSettings = (settings: any) => JSON.parse(JSON.stringify(settings));

// Set to true only when you need to force all users onto the new defaults
// regardless of their custom changes. Leave false for normal behavior.
const FORCE_DEFAULT_SETTINGS_UPDATE = true;

// Persist version used by redux-persist migrations. Bump when adding/changing migrations.
const PERSIST_VERSION = 4;

// Snapshots of defaults by persist version. When you change defaults, add a new entry with
// the *old* defaults keyed by the version you are migrating from. This lets us detect
// whether the user ever customized settings for that version.
const DEFAULT_SETTINGS_SNAPSHOTS: Record<number, any> = {
  // v0 (pre-versioned) defaults. Update these entries when defaults change so migration
  // can tell whether the user customized.
  0: cloneSettings(appInitialState.settings)
};

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

// Migration to apply new defaults only for users who never customized settings,
// unless FORCE_DEFAULT_SETTINGS_UPDATE is enabled.
const migrateSettings = (state: any) => {
  if (!state?.settings) return state;

  const previousVersion = state?._persist?.version ?? 0;
  const previousDefaults =
    DEFAULT_SETTINGS_SNAPSHOTS[previousVersion] ?? DEFAULT_SETTINGS_SNAPSHOTS[0];
  if (!previousDefaults) return state;

  const userChangedSettings = !areSettingsEqualToSnapshot(state.settings, previousDefaults);
  if (userChangedSettings && !FORCE_DEFAULT_SETTINGS_UPDATE) return state;

  return {
    ...state,
    // Deep clone to avoid mutating the source defaults in future writes
    settings: cloneSettings(appInitialState.settings)
  };
};

// Ensure migration runs on every version bump up to PERSIST_VERSION
const migrations: MigrationManifest = Object.fromEntries(
  Array.from({ length: PERSIST_VERSION }, (_, index) => [index + 1, migrateSettings])
);

const persistConfig = {
  key: 'shares',
  version: PERSIST_VERSION,
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
