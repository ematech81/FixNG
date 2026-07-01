import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@fixng_theme';

export const LIGHT = {
  // Backgrounds
  bg:          '#FFFFFF',
  bgAlt:       '#F5F5F5',
  surface:     '#FAFAFA',
  surfaceAlt:  '#F0F4FF',
  card:        '#FFFFFF',
  inputBg:     '#F8F9FE',

  // Text
  text:        '#1A1A1A',
  textSub:     '#555555',
  textMuted:   '#888888',
  textHint:    '#BBBBBB',
  textInverse: '#FFFFFF',

  // Brand — primary orange, never changes between themes
  primary:         '#FF6B00',
  primaryDark:     '#CC5500',
  primaryLight:    '#FFF3EC',
  primaryFaint:    '#FFE0CC',
  primaryDisabled: '#FFCBA4',

  // Borders / dividers
  border:       '#E5E5E5',
  borderLight:  '#F0F0F0',
  borderInput:  '#E8ECF4',

  // Semantic — success
  success:     '#16A34A',
  successDark: '#14532D',
  successBg:   '#F0FDF4',

  // Semantic — warning
  warning:     '#F59E0B',
  warningDark: '#92400E',
  warningBg:   '#FFFBEB',

  // Semantic — error
  error:       '#EF4444',
  errorDark:   '#991B1B',
  errorBg:     '#FEF2F2',

  // Semantic — info / blue
  info:     '#2563EB',
  infoDark: '#1E3A8A',
  infoBg:   '#EFF6FF',

  // Tab bar
  tabBar:      '#FFFFFF',
  tabBorder:   '#E5E5E5',
  tabActive:   '#FF6B00',
  tabInactive: '#9CA3AF',

  // Misc
  statusBar: 'dark',
  overlay:   'rgba(0,0,0,0.5)',
  shadow:    '#000000',
  star:      '#F59E0B',
  starEmpty: '#E5E5E5',
};

export const DARK = {
  // Backgrounds (Telegram-style deep blue-grey)
  bg:         '#17212B',
  bgAlt:      '#1E2A38',
  surface:    '#232E3C',
  surfaceAlt: '#1A2534',
  card:       '#232E3C',
  inputBg:    '#1E2A38',

  // Text
  text:        '#FFFFFF',
  textSub:     '#B8C8D8',
  textMuted:   '#8DA0B3',
  textHint:    '#4B6075',
  textInverse: '#17212B',

  // Brand — primary orange unchanged
  primary:         '#FF6B00',
  primaryDark:     '#CC5500',
  primaryLight:    '#3D1A00',
  primaryFaint:    '#5C2900',
  primaryDisabled: '#7A3200',

  // Borders / dividers
  border:      '#2B3A4A',
  borderLight: '#1E2C3A',
  borderInput: '#2B3A4A',

  // Semantic — success (lighter for dark bg readability)
  success:     '#34D399',
  successDark: '#059669',
  successBg:   '#0D2E1F',

  // Semantic — warning
  warning:     '#FCD34D',
  warningDark: '#D97706',
  warningBg:   '#2E1F00',

  // Semantic — error
  error:       '#F87171',
  errorDark:   '#DC2626',
  errorBg:     '#2E0E0E',

  // Semantic — info / blue
  info:     '#60A5FA',
  infoDark: '#2563EB',
  infoBg:   '#0D1F3C',

  // Tab bar
  tabBar:      '#17212B',
  tabBorder:   '#2B3A4A',
  tabActive:   '#FF6B00',
  tabInactive: '#4B6075',

  // Misc
  statusBar: 'light',
  overlay:   'rgba(0,0,0,0.7)',
  shadow:    '#000000',
  star:      '#FCD34D',
  starEmpty: '#2B3A4A',
};

const ThemeContext = createContext({
  colors: LIGHT,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  // null = follow system, 'light' or 'dark' = manual override
  const [manualScheme, setManualScheme] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setManualScheme(saved);
    });
  }, []);

  const scheme = manualScheme ?? systemScheme ?? 'light';
  const isDark = scheme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';
    setManualScheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
