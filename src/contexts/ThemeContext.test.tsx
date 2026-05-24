import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { act } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
const matchMediaMock = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Test component that uses the theme hook
function TestComponent() {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="effective-theme">{effectiveTheme}</div>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.className = '';
  });

  it('should provide default theme as system', () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('should detect system dark mode preference', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(true));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should detect system light mode preference', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should set theme to light', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const lightButton = screen.getByText('Set Light');
    await act(async () => {
      lightButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should set theme to dark', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const darkButton = screen.getByText('Set Dark');
    await act(async () => {
      darkButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should toggle theme through light -> dark -> system cycle', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByText('Toggle');

    // Initial: system
    expect(screen.getByTestId('theme')).toHaveTextContent('system');

    // First toggle: system -> light
    await act(async () => {
      toggleButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    // Second toggle: light -> dark
    await act(async () => {
      toggleButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    // Third toggle: dark -> system
    await act(async () => {
      toggleButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });
  });

  it('should persist theme to localStorage', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const darkButton = screen.getByText('Set Dark');
    await act(async () => {
      darkButton.click();
    });

    await waitFor(() => {
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });
  });

  it('should load theme from localStorage on mount', async () => {
    localStorageMock.setItem('theme', 'dark');
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock(false));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within ThemeProvider');

    console.error = consoleError;
  });
});
