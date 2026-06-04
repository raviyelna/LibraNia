import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Layout } from './components/Layout/Layout';
import { Home } from './routes/Home';
import { LibraryPage } from './routes/Library';
import { Chat } from './routes/Chat';
import { SettingsPage } from './routes/Settings';
import { GraphView } from './components/Graph/GraphView';
import { Toaster } from 'react-hot-toast';
import './styles/editor.css';

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
      <SocketProvider>
        <ErrorBoundary>
          <Toaster />
          <OfflineIndicator />
          <HashRouter>
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
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
