import React, { createContext, useContext, useMemo, useState } from 'react';
import { DEFAULT_THEME, Palette, themes } from './theme';
import * as db from './db';

interface ThemeValue {
  theme: Palette;
  setThemeKey: (key: string) => void;
}

const ThemeContext = createContext<ThemeValue>({
  theme: themes[DEFAULT_THEME],
  setThemeKey: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(() => db.getSetting('theme', DEFAULT_THEME));

  const value = useMemo<ThemeValue>(
    () => ({
      theme: themes[key] ?? themes[DEFAULT_THEME],
      setThemeKey: (k: string) => {
        db.setSetting('theme', k);
        setKey(k);
      },
    }),
    [key]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext).theme;
}

export function useThemeControls(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Memoizes a StyleSheet factory against the active palette so styles
 * rebuild only when the theme changes.
 */
export function useThemedStyles<T>(factory: (theme: Palette) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme]);
}
