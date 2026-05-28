import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
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
    console.log('=== [DEBUG] Route changed ===');
    console.log('Path:', location.pathname);
    console.log('Full location:', location);
    console.log('=============================');
  }, [location]);

  useEffect(() => {
    console.log('[DEBUG] DebugLogger mounted - click tracking active');

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      console.log('=== [DEBUG] CLICK ===');
      console.log('Tag:', target.tagName);
      console.log('ID:', target.id);
      console.log('Class:', target.className);
      console.log('Text:', target.textContent?.substring(0, 50));
      console.log('Current path:', location.pathname);
      console.log('====================');
    };

    document.addEventListener('click', handleClick, true); // Use capture phase
    return () => document.removeEventListener('click', handleClick, true);
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
        <HashRouter>
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
        </HashRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
