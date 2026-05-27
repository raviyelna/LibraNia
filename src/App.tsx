import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Layout } from './components/Layout/Layout';
import { Home } from './routes/Home';
import { LibraryPage } from './routes/Library';
import { Chat } from './routes/Chat';
import { SettingsPage } from './routes/Settings';
import { GraphView } from './components/Graph/GraphView';
import './styles/editor.css';

/**
 * Debug component to log route changes and clicks
 */
function DebugLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log('[DEBUG] Route changed:', location.pathname, location);
  }, [location]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      console.log('[DEBUG] Click:', {
        tag: target.tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.substring(0, 50),
        path: location.pathname
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [location]);

  return null;
}

/**
 * LibraNia Application Root
 *
 * Offline Capabilities (APP-05):
 * ✓ Works offline: UI navigation, theme switching, mode switching, local data access
 * ✗ Requires network: AI API calls (Phase 3+), web search (Phase 3+), embedding generation if using API (Phase 5+)
 *
 * Phase 1 has no network dependencies, so app is fully functional offline.
 */
function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <OfflineIndicator />
        <BrowserRouter>
          <DebugLogger />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="chat" element={<Chat />} />
              <Route path="graph" element={<GraphView />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
