import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { Sidebar } from './Sidebar';
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

// Mock matchMedia for ThemeProvider
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Helper to render Sidebar with required providers
function renderSidebar() {
  return render(
    <ThemeProvider>
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    </ThemeProvider>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render sidebar in expanded state by default', () => {
    renderSidebar();

    expect(screen.getByText('LibraNia')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should collapse sidebar when toggle button is clicked', async () => {
    renderSidebar();

    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });

    await act(async () => {
      toggleButton.click();
    });

    await waitFor(() => {
      // In collapsed state, text labels should not be visible
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.queryByText('Library')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  it('should expand sidebar when toggle button is clicked again', async () => {
    renderSidebar();

    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });

    // Collapse
    await act(async () => {
      toggleButton.click();
    });

    // Expand
    await act(async () => {
      toggleButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Library')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('should persist collapsed state to localStorage', async () => {
    renderSidebar();

    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });

    await act(async () => {
      toggleButton.click();
    });

    await waitFor(() => {
      expect(localStorageMock.getItem('sidebar-collapsed')).toBe('true');
    });
  });

  it('should load collapsed state from localStorage on mount', () => {
    localStorageMock.setItem('sidebar-collapsed', 'true');

    renderSidebar();

    // In collapsed state, text labels should not be visible
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('should render navigation icons', () => {
    renderSidebar();

    // Icons should be present (lucide-react renders SVGs)
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render theme toggle button', () => {
    renderSidebar();

    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toBeInTheDocument();
  });
});
