import { createContext, useContext } from 'react';

export type ColorMode = 'light' | 'dark';

export interface ColorModeContextValue {
  mode: ColorMode;
  toggleMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
});

export const useColorMode = (): ColorModeContextValue => useContext(ColorModeContext);
