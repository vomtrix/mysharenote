import React from 'react';

export type ColorMode = 'light' | 'dark';

export const ColorModeContext = React.createContext<{
  mode: ColorMode;
  toggle: () => void;
  setMode: (m: ColorMode) => void;
}>({ mode: 'light', toggle: () => {}, setMode: () => {} });
