import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    customBadge: {
      fail: string;
      warn: string;
      success: string;
      exceed: string;
    };
  }
  interface PaletteOptions {
    customBadge?: {
      fail: string;
      warn: string;
      success: string;
      exceed: string;
    };
  }
}
