import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

describe('Sidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render sidebar in expanded state by default', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('LibraNia')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should collapse sidebar when toggle button is clicked', async () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

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
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

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
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

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

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // In collapsed state, text labels should not be visible
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('should render navigation icons', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // Icons should be present (lucide-react renders SVGs)
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render theme toggle button', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toBeInTheDocument();
  });
});
