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
import app, {
  initialState as appInitialState,
  SETTINGS_DEFAULT_VERSION
} from '@store/app/AppReducer';
import type { MigrationManifest } from 'redux-persist';

const cloneSettings = (settings: any) => JSON.parse(JSON.stringify(settings));

const areSettingsEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const valA = (a as any)[key];
    const valB = (b as any)[key];
    const bothObjects = valA && valB && typeof valA === 'object' && typeof valB === 'object';
    if (bothObjects) {
      if (!areSettingsEqual(valA, valB)) return false;
      continue;
    }
    if (valA !== valB) return false;
  }
  return true;
};
// Set to true only when you need to force all users onto the new defaults
// regardless of their custom changes. Leave false for normal behavior.
const FORCE_DEFAULT_SETTINGS_UPDATE = true;

// Persist version used by redux-persist migrations. Bump when adding/changing migrations.
const PERSIST_VERSION = 7;

// Version to represent the current default settings payload (bump when defaults change).
const CURRENT_SETTINGS_VERSION = SETTINGS_DEFAULT_VERSION;

// Migration to apply new defaults conditionally, with an option to force.
const migrateSettings = (state: any) => {
  if (!state?.settings) return state;

  // If force is enabled, always overwrite with current defaults.
  if (FORCE_DEFAULT_SETTINGS_UPDATE) {
    return {
      ...state,
      settings: cloneSettings(appInitialState.settings),
      settingsUserModified: false,
      settingsVersionApplied: CURRENT_SETTINGS_VERSION
    };
  }

  const userModified = Boolean(state.settingsUserModified);
  const appliedVersion =
    typeof state.settingsVersionApplied === 'number' ? state.settingsVersionApplied : 0;

  // Backfill meta for older persisted states that lack markers: if settings already equal
  // current defaults, just stamp the version; otherwise assume user-modified to avoid clobbering.
  if (appliedVersion === 0 && state.settingsUserModified === undefined) {
    const matchesCurrentDefaults = areSettingsEqual(state.settings, appInitialState.settings);
    if (matchesCurrentDefaults) {
      return {
        ...state,
        settingsVersionApplied: CURRENT_SETTINGS_VERSION,
        settingsUserModified: false
      };
    }
    return {
      ...state,
      settingsUserModified: true,
      settingsVersionApplied: CURRENT_SETTINGS_VERSION
    };
  }

  // If user modified settings, keep them but bump version marker.
  if (userModified) {
    if (appliedVersion < CURRENT_SETTINGS_VERSION) {
      return {
        ...state,
        settingsVersionApplied: CURRENT_SETTINGS_VERSION
      };
    }
    return state;
  }

  // User did not modify: refresh to current defaults if behind.
  if (appliedVersion < CURRENT_SETTINGS_VERSION) {
    return {
      ...state,
      settings: cloneSettings(appInitialState.settings),
      settingsUserModified: false,
      settingsVersionApplied: CURRENT_SETTINGS_VERSION
    };
  }

  return state;
};

// Ensure migration runs on every version bump up to PERSIST_VERSION
const migrationVersions = [-1, 0, ...Array.from({ length: PERSIST_VERSION }, (_, index) => index + 1)];
const migrations: MigrationManifest = Object.fromEntries(
  migrationVersions.map((version) => [version, migrateSettings])
);

const persistConfig = {
  key: 'shares',
  version: PERSIST_VERSION,
  storage,
  whitelist: ['address', 'settings', 'settingsUserModified', 'settingsVersionApplied', 'colorMode'],
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
