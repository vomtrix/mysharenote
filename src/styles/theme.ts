import { createTheme, Theme } from '@mui/material/styles';
import { THEME_PRIMARY } from '@styles/colors';
import {
  DARK_MODE_DEFAULT,
  THEME_BADGE_RATIO_EXCEED,
  THEME_BADGE_RATIO_FAIL,
  THEME_BADGE_RATIO_SUCCESS,
  THEME_BADGE_RATIO_WARN,
  THEME_PRIMARY_COLOR_2,
  THEME_SECONDARY_COLOR,
  THEME_TEXT_DARK_PRIMARY,
  THEME_TEXT_DARK_SECONDARY,
  THEME_TEXT_LIGHT_PRIMARY,
  THEME_TEXT_LIGHT_SECONDARY
} from 'src/config/config';

const customTheme = (outerTheme: Theme, mode: 'light' | 'dark' = DARK_MODE_DEFAULT) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? THEME_PRIMARY_COLOR_2 : THEME_PRIMARY
      },
      secondary: {
        main: THEME_SECONDARY_COLOR
      },
      customBadge: {
        fail: THEME_BADGE_RATIO_FAIL,
        warn: THEME_BADGE_RATIO_WARN,
        success: THEME_BADGE_RATIO_SUCCESS,
        exceed: THEME_BADGE_RATIO_EXCEED
      },
      text:
        mode === 'dark'
          ? { primary: THEME_TEXT_DARK_PRIMARY, secondary: THEME_TEXT_DARK_SECONDARY }
          : { primary: THEME_TEXT_LIGHT_PRIMARY, secondary: THEME_TEXT_LIGHT_SECONDARY }
    },
    components: {}
  });

export default customTheme;
