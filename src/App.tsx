import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Layout } from './components/Layout/Layout';
import { Home } from './routes/Home';
import { LibraryPage } from './routes/Library';
import { SettingsPage } from './routes/Settings';
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
      <ErrorBoundary>
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
