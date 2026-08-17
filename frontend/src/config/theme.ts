import { createTheme, type Theme } from '@mui/material/styles';
import { getTokens } from './colorTokens';

const fontMono =
  'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace';
const fontSans =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const fontFamilyMono = fontMono;

export const buildTheme = (mode: 'light' | 'dark'): Theme => {
  const tokens = getTokens(mode);

  return createTheme({
    palette: {
      mode,
      background: {
        default: tokens.ground,
        paper: tokens.surface,
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      divider: tokens.border,
      primary: {
        main: tokens.accent,
      },
      success: {
        main: tokens.pass,
        light: tokens.passBg,
        dark: tokens.passBorder,
        contrastText: tokens.pass,
      },
      error: {
        main: tokens.fail,
        light: tokens.failBg,
        dark: tokens.failBorder,
        contrastText: tokens.fail,
      },
      warning: {
        main: tokens.changed,
        light: tokens.changedBg,
        dark: tokens.changedBorder,
        contrastText: tokens.changed,
      },
    },
    typography: {
      fontFamily: fontSans,
      fontSize: 14,
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};
