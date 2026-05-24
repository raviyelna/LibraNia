import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { ThemeContextValue } from '../types/theme';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
