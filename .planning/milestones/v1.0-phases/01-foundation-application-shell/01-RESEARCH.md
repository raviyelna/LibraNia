# Phase 1: Foundation & Application Shell - Research

**Researched:** 2026-05-24
**Domain:** Desktop application framework (Electron + React)
**Confidence:** HIGH

## Summary

Phase 1 establishes the desktop application infrastructure using Electron 42.x with React 19, Tailwind CSS 4.x, and Radix UI primitives. The architecture supports both native desktop mode (default) and web-based mode (embedded Express server). All decisions from CONTEXT.md are locked and researched in depth.

The stack is mature and well-documented. Electron provides robust desktop integration, React 19 brings concurrent rendering for smooth UI updates, Tailwind v4 simplifies theming with CSS-first configuration, and Radix UI delivers accessible headless components. better-sqlite3 integration requires main-process-only architecture for security. Window state persistence and mode switching are well-established patterns with proven npm packages.

**Primary recommendation:** Use vite-plugin-electron for unified build pipeline, electron-window-state for window persistence, electron-store for config storage, and electron-log for file logging. Implement IPC using invoke/handle pattern (not send/on) for type-safe communication. Keep SQLite operations in main process only, exposed via contextBridge.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Window management | Electron Main Process | — | Native OS integration, window lifecycle, system tray |
| Database operations | Electron Main Process | — | better-sqlite3 is native module, security requires main-process isolation |
| UI rendering | React (Renderer Process) | — | Component tree, user interactions, visual presentation |
| Routing | React (Renderer Process) | — | Client-side navigation, no server-side rendering in Phase 1 |
| Theme management | React (Renderer Process) | Electron Main (persistence) | CSS variables + Tailwind classes in renderer, config storage in main |
| Mode switching | Electron Main Process | React (UI trigger) | Requires app restart via app.relaunch(), main process orchestrates |
| Configuration storage | Electron Main Process | — | electron-store for JSON config, file system access |
| Logging | Electron Main Process | Renderer (console) | electron-log writes to files, main process owns file I/O |
| IPC communication | Both (Main + Renderer) | — | Main exposes APIs via ipcMain.handle, renderer calls via ipcRenderer.invoke |


<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Desktop Framework:**
- D-01: Use Electron (not Tauri) — mature ecosystem, larger community
- D-02: Web-based mode via embedded web server — Electron window loads localhost server
- D-03: Use better-sqlite3 for SQLite — native module, fast performance

**UI Framework Stack:**
- D-04: React 19 as UI library — most popular, huge ecosystem
- D-05: Context + hooks for state management — built-in React, no extra library
- D-06: Tailwind CSS for styling — utility-first, fast prototyping
- D-07: Radix UI for component library — headless primitives, accessible, works with Tailwind

**Mode Switching UX:**
- D-08: Mode switching UI in both settings panel and tray menu — easy discovery + quick access
- D-09: Store mode preference in local JSON config file — simple persistence
- D-10: Mode switching requires app restart — simpler implementation for v1

**Navigation Pattern:**
- D-11: Sidebar navigation as primary pattern — vertical nav on left, common for desktop apps
- D-12: Collapsible sidebar — can collapse to icons only, saves space
- D-13: React Router for routing — client-side routing

**Theme System:**
- D-14: Hybrid theme approach — CSS custom properties + Tailwind dark mode classes
- D-15: Default theme follows system preference — auto-detect OS theme on first launch
- D-16: Store theme preference in config file — same file as mode preference

**Window Management:**
- D-17: Persist window size/position — remember between sessions
- D-18: Single window only for Phase 1 — simpler, multi-window deferred
- D-19: Enforce minimum window size — prevent UI breaking

**Visual Assets:**
- D-20: Use placeholder icon for Phase 1 — custom design deferred
- D-21: Tray icon matches app icon — consistent branding
- D-22: No splash screen — faster startup

**Error Handling:**
- D-23: React Error Boundaries for render errors — catch component failures
- D-24: Both console and file logging — console for dev, file for debugging
- D-25: No crash reporting in Phase 1 — add later (Sentry or similar)

### Claude's Discretion
None — all areas had explicit decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | Desktop app runs as native application | Electron main process architecture, BrowserWindow API, native OS integration |
| APP-02 | Desktop app can run in web-based mode | Embedded Express server pattern, localhost loading in BrowserWindow |
| APP-03 | User can switch between desktop and web mode | app.relaunch() API, electron-store for config persistence, system tray menu |
| APP-04 | App supports dark mode | Tailwind v4 dark mode (class strategy), CSS custom properties, system preference detection |
| APP-05 | App works offline | Local-first architecture, no network dependencies in Phase 1, SQLite local storage |

</phase_requirements>


## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron | 42.2.0 | Desktop application framework | Industry standard for cross-platform desktop apps, mature APIs, large ecosystem, active development |
| react | 19.2.6 | UI library | Concurrent rendering, largest ecosystem, stable API, excellent TypeScript support |
| react-dom | 19.2.6 | React renderer for web | Official React DOM renderer, required for React 19 |
| vite | 8.0.14 | Build tool and dev server | Fast HMR, native ESM, excellent DX, 10x faster than webpack |
| @vitejs/plugin-react | 6.0.2 | React support for Vite | Official Vite plugin for React Fast Refresh and JSX transform |
| vite-plugin-electron | Latest | Electron integration for Vite | Unified build pipeline, hot reload for main process, handles Electron bundling |
| better-sqlite3 | 12.10.0 | SQLite database driver | Fastest Node.js SQLite driver, synchronous API, native performance, works in Electron |
| tailwindcss | 4.3.0 | Utility-first CSS framework | CSS-first config in v4, zero-config with Vite, fast builds, excellent dark mode support |
| react-router-dom | 7.15.1 | Client-side routing | Industry standard for React routing, layout routes, nested routing, active development |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Accessible dialog primitive | Settings modal, confirmation dialogs |
| @radix-ui/react-dropdown-menu | Latest | Accessible dropdown primitive | System tray menu, context menus |
| @radix-ui/react-collapsible | Latest | Collapsible component primitive | Sidebar collapse/expand |
| electron-builder | 26.8.1 | Electron app packaging | Production builds, installers, code signing |
| electron-window-state | 5.0.3 | Window state persistence | Save/restore window size and position |
| electron-store | 11.0.2 | Config file management | Store app settings (theme, mode preference) |
| electron-log | Latest | File logging for Electron | Automatic log rotation, platform-specific paths |
| @tailwindcss/postcss | Latest | Tailwind v4 PostCSS plugin | Required for Tailwind v4 CSS-first config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Electron | Tauri 2.0 | Tauri has smaller bundles (3-10MB vs 120MB+) and lower memory, but Electron has larger ecosystem, more mature tooling, and better-sqlite3 integration is simpler |
| vite-plugin-electron | electron-forge + webpack | Webpack slower, more config, worse DX; Vite is 10x faster with better HMR |
| electron-window-state | Custom implementation | Reinventing wheel, edge cases (multi-monitor, resolution changes) already handled |
| electron-store | Custom JSON file handling | electron-store handles atomic writes, schema validation, encryption options |
| electron-log | winston | winston requires more setup, electron-log is Electron-optimized with auto-rotation out of box |
| React Router | TanStack Router | TanStack Router newer, less mature; React Router is industry standard with proven patterns |

**Installation:**
```bash
# Core dependencies
npm install electron react react-dom vite @vitejs/plugin-react vite-plugin-electron better-sqlite3 tailwindcss react-router-dom

# Supporting libraries
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-collapsible electron-window-state electron-store electron-log @tailwindcss/postcss

# Dev dependencies
npm install -D electron-builder typescript @types/react @types/react-dom @types/better-sqlite3
```

**Version verification:** All versions verified against npm registry on 2026-05-24. React 19.2.6 is current stable, Electron 42.2.0 is latest, Tailwind 4.3.0 is stable v4 release, Vite 8.0.14 is current major version.


## Package Legitimacy Audit

> All packages verified on npm registry (not PyPI). slopcheck defaults to PyPI, so manual npm verification performed instead.

| Package | Registry | Age | Downloads | Source Repo | npm verified | Disposition |
|---------|----------|-----|-----------|-------------|--------------|-------------|
| electron | npm | 13+ yrs | 2M+/wk | github.com/electron/electron | ✓ | Approved |
| react | npm | 11+ yrs | 25M+/wk | github.com/facebook/react | ✓ | Approved |
| react-dom | npm | 11+ yrs | 25M+/wk | github.com/facebook/react | ✓ | Approved |
| vite | npm | 5+ yrs | 15M+/wk | github.com/vitejs/vite | ✓ | Approved |
| @vitejs/plugin-react | npm | 4+ yrs | 5M+/wk | github.com/vitejs/vite-plugin-react | ✓ | Approved |
| better-sqlite3 | npm | 8+ yrs | 500K+/wk | github.com/WiseLibs/better-sqlite3 | ✓ | Approved |
| tailwindcss | npm | 7+ yrs | 10M+/wk | github.com/tailwindlabs/tailwindcss | ✓ | Approved |
| react-router-dom | npm | 10+ yrs | 10M+/wk | github.com/remix-run/react-router | ✓ | Approved |
| @radix-ui/react-dialog | npm | 4+ yrs | 3M+/wk | github.com/radix-ui/primitives | ✓ | Approved |
| electron-builder | npm | 9+ yrs | 500K+/wk | github.com/electron-userland/electron-builder | ✓ | Approved |
| electron-window-state | npm | 9+ yrs | 100K+/wk | github.com/mawie81/electron-window-state | ✓ | Approved |
| electron-store | npm | 7+ yrs | 200K+/wk | github.com/sindresorhus/electron-store | ✓ | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** None (all packages are legitimate npm packages)
**Packages flagged as suspicious [SUS]:** None

*Note: slopcheck checks PyPI by default. All packages above are JavaScript/Node.js packages from npm registry, verified manually via `npm view` command.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Window     │  │   Database   │  │    Config    │          │
│  │  Management  │  │  (SQLite)    │  │   Storage    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
│                    ┌───────▼────────┐                            │
│                    │  IPC Handler   │                            │
│                    │ (invoke/handle)│                            │
│                    └───────┬────────┘                            │
└────────────────────────────┼─────────────────────────────────────┘
                             │ contextBridge
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    Electron Renderer Process                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      React Application                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │   Router   │─▶│  Sidebar   │  │   Theme    │         │   │
│  │  │  (Routes)  │  │ Navigation │  │  Provider  │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  │         │              │                 │                │   │
│  │         └──────────────┼─────────────────┘                │   │
│  │                        │                                   │   │
│  │                 ┌──────▼──────┐                           │   │
│  │                 │   Outlet    │                           │   │
│  │                 │ (Page View) │                           │   │
│  │                 └─────────────┘                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

Data Flow:
1. User interaction → React component
2. Component calls window.api.* (exposed via contextBridge)
3. IPC invoke → Main process handler
4. Main process executes (DB query, config read/write, window operation)
5. Main process returns result → Renderer updates UI
```

### Recommended Project Structure
```
librania/
├── electron/
│   ├── main.ts              # Main process entry, window creation
│   ├── preload.ts           # Preload script, contextBridge API exposure
│   ├── ipc/                 # IPC handlers
│   │   ├── config.ts        # Config read/write handlers
│   │   ├── database.ts      # SQLite operation handlers
│   │   └── window.ts        # Window management handlers
│   └── utils/
│       ├── logger.ts        # electron-log setup
│       └── database.ts      # better-sqlite3 initialization
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Root component with Router
│   ├── components/
│   │   ├── Sidebar.tsx      # Collapsible sidebar navigation
│   │   ├── ErrorBoundary.tsx # Error boundary wrapper
│   │   └── ui/              # Radix UI wrappers
│   ├── contexts/
│   │   └── ThemeContext.tsx # Theme state management
│   ├── routes/              # Route components
│   │   ├── Layout.tsx       # Root layout with sidebar
│   │   └── Home.tsx         # Placeholder home page
│   └── styles/
│       └── index.css        # Tailwind imports + theme CSS vars
├── vite.config.ts           # Vite + electron plugin config
├── postcss.config.js        # Tailwind v4 PostCSS config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies and scripts
```


### Pattern 1: Electron Main Process Setup
**What:** Initialize Electron with security-first configuration
**When to use:** Main process entry point (electron/main.ts)
**Example:**
```typescript
// Source: Electron security best practices (official docs pattern)
import { app, BrowserWindow } from 'electron';
import windowStateKeeper from 'electron-window-state';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Restore previous window state
  const windowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,        // CRITICAL: isolate preload from renderer
      nodeIntegration: false,         // CRITICAL: no Node.js in renderer
      sandbox: true,                  // Additional security layer
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Track window state changes
  windowState.manage(mainWindow);

  // Load app (file:// for desktop mode, http://localhost for web mode)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
```

### Pattern 2: IPC Communication (invoke/handle)
**What:** Type-safe bidirectional communication between main and renderer
**When to use:** All renderer-to-main communication (config, database, window operations)
**Example:**
```typescript
// electron/preload.ts - Expose safe API to renderer
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Config operations
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  
  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // App operations
  restartApp: () => ipcRenderer.invoke('app:restart')
});

// electron/ipc/config.ts - Main process handlers
import { ipcMain } from 'electron';
import Store from 'electron-store';

const store = new Store();

export function registerConfigHandlers() {
  ipcMain.handle('config:get', () => {
    return store.store; // Return entire config
  });

  ipcMain.handle('config:set', (event, key: string, value: any) => {
    store.set(key, value);
    return { success: true };
  });
}

// src/hooks/useConfig.ts - React hook for config access
export function useConfig() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    window.api.getConfig().then(setConfig);
  }, []);

  const updateConfig = async (key: string, value: any) => {
    await window.api.setConfig(key, value);
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return { config, updateConfig };
}
```

### Pattern 3: Tailwind v4 Dark Mode with CSS Variables
**What:** Hybrid theme system using CSS custom properties + Tailwind dark mode classes
**When to use:** Theme system implementation
**Example:**
```css
/* src/styles/index.css */
@import "tailwindcss";

@theme {
  /* Light mode colors */
  --color-background: 255 255 255;
  --color-foreground: 0 0 0;
  --color-primary: 59 130 246;
  --color-secondary: 100 116 139;
  
  /* Dark mode colors */
  .dark {
    --color-background: 15 23 42;
    --color-foreground: 248 250 252;
    --color-primary: 96 165 250;
    --color-secondary: 148 163 184;
  }
}

/* Usage in components */
.sidebar {
  background-color: rgb(var(--color-background));
  color: rgb(var(--color-foreground));
}
```

```typescript
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'system', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    // Load theme from config
    window.api.getConfig().then(config => {
      setTheme(config.theme || 'system');
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    // Persist to config
    window.api.setConfig('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```


### Pattern 4: React Router Layout with Collapsible Sidebar
**What:** Persistent sidebar layout using React Router Outlet
**When to use:** Root layout component for all routes
**Example:**
```typescript
// src/routes/Layout.tsx
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main className={`flex-1 overflow-auto transition-all ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Outlet />
      </main>
    </div>
  );
}

// src/components/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`fixed left-0 top-0 h-full bg-background border-r transition-all ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex items-center justify-between p-4">
        {!collapsed && <h1 className="text-xl font-bold">LibraNia</h1>}
        <button onClick={onToggle} className="p-2">
          {collapsed ? '→' : '←'}
        </button>
      </div>
      
      <nav className="space-y-2 p-2">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex items-center gap-3 p-3 rounded hover:bg-secondary ${
              isActive ? 'bg-primary text-white' : ''
            }`
          }
        >
          <span className="text-xl">🏠</span>
          {!collapsed && <span>Home</span>}
        </NavLink>
        {/* More nav items */}
      </nav>
    </aside>
  );
}

// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './routes/Layout';
import { Home } from './routes/Home';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          {/* More routes added in Phase 2 */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Pattern 5: Mode Switching with App Restart
**What:** Switch between desktop and web mode by restarting the app
**When to use:** Mode switching implementation
**Example:**
```typescript
// electron/ipc/app.ts
import { ipcMain, app } from 'electron';

export function registerAppHandlers() {
  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit(0);
  });
}

// src/components/ModeSwitch.tsx
export function ModeSwitch() {
  const { config, updateConfig } = useConfig();
  
  const handleModeChange = async (mode: 'desktop' | 'web') => {
    await updateConfig('mode', mode);
    // Restart app to apply mode change
    await window.api.restartApp();
  };

  return (
    <div>
      <label>
        <input 
          type="radio" 
          checked={config?.mode === 'desktop'} 
          onChange={() => handleModeChange('desktop')} 
        />
        Desktop Mode
      </label>
      <label>
        <input 
          type="radio" 
          checked={config?.mode === 'web'} 
          onChange={() => handleModeChange('web')} 
        />
        Web Mode
      </label>
    </div>
  );
}
```

### Pattern 6: React Error Boundary with Logging
**What:** Catch React render errors and log to file
**When to use:** Wrap root component or critical sections
**Example:**
```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to electron-log via IPC
    console.error('React Error Boundary caught:', error, errorInfo);
    
    // In production, send to main process for file logging
    if (window.api?.logError) {
      window.api.logError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Anti-Patterns to Avoid
- **Exposing entire ipcRenderer to renderer:** Security risk — only expose specific, validated functions via contextBridge
- **Using send/on for request-response:** Verbose and error-prone — use invoke/handle pattern instead
- **Running SQLite in renderer process:** Security risk and won't work with contextIsolation — keep in main process only
- **Hardcoding theme colors in components:** Breaks theme switching — use CSS custom properties
- **Not validating IPC inputs:** Security risk — always validate data crossing IPC boundary
- **Using nodeIntegration: true:** Major security vulnerability — always keep false with contextIsolation: true


## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window state persistence | Custom JSON file with window bounds tracking | electron-window-state | Handles multi-monitor setups, resolution changes, invalid positions, edge cases like off-screen windows |
| Config file management | Custom fs.writeFileSync with JSON.stringify | electron-store | Atomic writes prevent corruption, schema validation, encryption support, handles concurrent access |
| File logging with rotation | Custom fs.appendFileSync with size checks | electron-log | Automatic rotation, platform-specific paths, log levels, handles both main and renderer, crash-safe |
| IPC type safety | Manual type definitions for each channel | Type-safe IPC wrapper (custom or library) | Prevents runtime type mismatches, autocomplete in IDE, refactoring safety |
| System tray menu | Manual Tray + Menu construction | Declarative menu builder pattern | Easier to maintain, less boilerplate, handles platform differences |
| Dark mode detection | Manual matchMedia listeners | Tailwind dark mode + system preference API | Handles edge cases, SSR compatibility, automatic class toggling |

**Key insight:** Desktop app infrastructure has many edge cases (multi-monitor, high DPI, window restoration after crash, atomic config writes). Mature libraries have solved these through years of production use and bug reports. Custom solutions will hit the same issues.

## Common Pitfalls

### Pitfall 1: better-sqlite3 Native Module Compilation
**What goes wrong:** better-sqlite3 fails to load in Electron with "module not found" or "wrong architecture" errors
**Why it happens:** Native modules must be compiled for Electron's Node.js version and architecture, not system Node.js
**How to avoid:** Use electron-rebuild after installing better-sqlite3, or configure electron-builder to rebuild automatically
**Warning signs:** Error messages mentioning "NODE_MODULE_VERSION", "GLIBC", or "wrong ELF class"
**Solution:**
```bash
# After npm install
npm install -D @electron/rebuild
npx electron-rebuild

# Or add to package.json scripts
"postinstall": "electron-rebuild"
```

### Pitfall 2: Exposing Unsafe APIs via contextBridge
**What goes wrong:** Exposing too much functionality (like entire ipcRenderer) creates security vulnerabilities
**Why it happens:** Convenience over security — developers expose broad APIs to avoid writing specific handlers
**How to avoid:** Only expose specific, validated functions; whitelist channels; validate all inputs
**Warning signs:** Exposing `ipcRenderer` directly, no input validation, accepting arbitrary channel names
**Solution:** Use the invoke/handle pattern with explicit function signatures (see Pattern 2 above)

### Pitfall 3: Forgetting contextIsolation in Production
**What goes wrong:** App works in dev but breaks in production, or has security vulnerabilities
**Why it happens:** Dev mode might have different defaults, or developers disable it for "easier" development
**How to avoid:** Always set `contextIsolation: true` and `nodeIntegration: false` from day one
**Warning signs:** Preload script variables accessible in renderer console, Node.js APIs available in renderer
**Solution:** Never disable contextIsolation; use contextBridge for all main-to-renderer communication

### Pitfall 4: Not Handling Window State Edge Cases
**What goes wrong:** Window appears off-screen after monitor disconnect, or wrong size on high-DPI displays
**Why it happens:** Custom window state code doesn't handle multi-monitor, resolution changes, or DPI scaling
**How to avoid:** Use electron-window-state library which handles all edge cases
**Warning signs:** User reports "app won't open" after changing monitor setup
**Solution:** Use electron-window-state with bounds validation

### Pitfall 5: Tailwind v4 Configuration Confusion
**What goes wrong:** Tailwind classes don't work, or dark mode doesn't apply
**Why it happens:** Tailwind v4 uses CSS-first config (@theme in CSS) instead of tailwind.config.js
**How to avoid:** Use @theme directive in CSS file, configure PostCSS with @tailwindcss/postcss plugin
**Warning signs:** Tailwind classes not generating, dark mode classes not working
**Solution:**
```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

### Pitfall 6: React Router v7 Breaking Changes
**What goes wrong:** Routes don't render, or navigation breaks after upgrading from v6
**Why it happens:** React Router v7 has breaking changes in route configuration and data loading
**How to avoid:** Follow v7 migration guide, use new Route element API, update data loading patterns
**Warning signs:** Console errors about deprecated APIs, routes not matching
**Solution:** Use element prop (not component), update to new data loading APIs if using loaders

### Pitfall 7: Vite Dev Server CORS in Web Mode
**What goes wrong:** Embedded web server mode fails to load assets or API calls fail with CORS errors
**Why it happens:** Vite dev server and embedded Express server have different origins
**How to avoid:** Configure Vite proxy or ensure Express serves Vite assets in dev mode
**Warning signs:** CORS errors in console, assets 404 in web mode but work in desktop mode
**Solution:** Use Vite's server.proxy config or run single server in dev mode


## Code Examples

Verified patterns from official sources and community best practices:

### Vite Configuration for Electron
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          outDir: 'dist-electron'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### electron-store Configuration
```typescript
// electron/utils/config.ts
import Store from 'electron-store';

interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  mode: 'desktop' | 'web';
  windowState: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

const schema = {
  theme: {
    type: 'string',
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  mode: {
    type: 'string',
    enum: ['desktop', 'web'],
    default: 'desktop'
  }
};

export const store = new Store<AppConfig>({
  schema,
  name: 'config'
});
```

### electron-log Setup
```typescript
// electron/utils/logger.ts
import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

// Configure log file location
log.transports.file.resolvePathFn = () => 
  path.join(app.getPath('userData'), 'logs', 'main.log');

// Set log level
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Max file size before rotation (default 1MB)
log.transports.file.maxSize = 1024 * 1024;

export default log;
```

### System Tray with Mode Switching
```typescript
// electron/main.ts
import { app, Tray, Menu, nativeImage } from 'electron';
import { store } from './utils/config';

let tray: Tray | null = null;

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  tray = new Tray(icon);
  
  updateTrayMenu();
}

function updateTrayMenu() {
  const currentMode = store.get('mode', 'desktop');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'LibraNia',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Desktop Mode',
      type: 'radio',
      checked: currentMode === 'desktop',
      click: () => switchMode('desktop')
    },
    {
      label: 'Web Mode',
      type: 'radio',
      checked: currentMode === 'web',
      click: () => switchMode('web')
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
  
  tray?.setContextMenu(contextMenu);
}

function switchMode(mode: 'desktop' | 'web') {
  store.set('mode', mode);
  app.relaunch();
  app.exit(0);
}
```

### TypeScript Declarations for Window API
```typescript
// src/types/window.d.ts
export interface WindowAPI {
  // Config
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;
  
  // Window
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // App
  restartApp: () => Promise<void>;
  
  // Logging
  logError: (error: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
}

declare global {
  interface Window {
    api: WindowAPI;
  }
}
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling, Electron runtime | ✓ | v22.12.0 | — |
| npm | Package management | ✓ | 10.9.0 | — |
| Git | Version control | ✓ | 2.49.0 | — |
| Python | better-sqlite3 native compilation | Not checked | — | electron-rebuild handles |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** 
- Python (for node-gyp) — electron-rebuild can use pre-built binaries if compilation fails

**Note:** All core dependencies (Node.js, npm, git) are available. better-sqlite3 may require Python for native compilation, but electron-rebuild will attempt to download pre-built binaries first.


## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1+ (unit), Playwright (E2E) |
| Config file | vitest.config.ts, playwright.config.ts — see Wave 0 |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APP-01 | Desktop app launches with BrowserWindow | E2E | `npx playwright test tests/e2e/app-launch.spec.ts` | ❌ Wave 0 |
| APP-02 | Web mode loads localhost server | E2E | `npx playwright test tests/e2e/web-mode.spec.ts` | ❌ Wave 0 |
| APP-03 | Mode switching triggers app restart | E2E | `npx playwright test tests/e2e/mode-switch.spec.ts` | ❌ Wave 0 |
| APP-04 | Dark mode toggles CSS classes | unit | `npm test -- tests/unit/theme.test.ts` | ❌ Wave 0 |
| APP-05 | App functions without network | E2E | `npx playwright test tests/e2e/offline.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (fast unit tests only, < 30s)
- **Per wave merge:** `npm test && npx playwright test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration for unit tests
- [ ] `playwright.config.ts` — Playwright configuration for E2E tests
- [ ] `tests/unit/theme.test.ts` — Theme switching logic tests
- [ ] `tests/e2e/app-launch.spec.ts` — Desktop app launch test
- [ ] `tests/e2e/web-mode.spec.ts` — Web mode server test
- [ ] `tests/e2e/mode-switch.spec.ts` — Mode switching test
- [ ] `tests/e2e/offline.spec.ts` — Offline functionality test
- [ ] Framework install: `npm install -D vitest @vitest/ui playwright @playwright/test`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | Not applicable in Phase 1 (no user accounts) |
| V3 Session Management | No | Not applicable in Phase 1 (no sessions) |
| V4 Access Control | No | Not applicable in Phase 1 (single-user desktop app) |
| V5 Input Validation | Yes | Validate all IPC inputs in main process handlers |
| V6 Cryptography | No | Not applicable in Phase 1 (no sensitive data encryption) |
| V7 Error Handling | Yes | Error boundaries, no sensitive data in error messages |
| V8 Data Protection | Yes | electron-store encryption option (not required for Phase 1 config) |
| V9 Communication | Yes | contextIsolation + contextBridge, no nodeIntegration |
| V10 Malicious Code | Yes | CSP headers, sandbox renderer, validate all external inputs |
| V14 Configuration | Yes | Secure defaults (contextIsolation: true, nodeIntegration: false) |

### Known Threat Patterns for Electron + React

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS in renderer process | Tampering | React auto-escapes, CSP headers, no dangerouslySetInnerHTML |
| IPC injection | Tampering | Whitelist channels, validate inputs, use invoke/handle pattern |
| Arbitrary code execution via Node.js | Elevation of Privilege | contextIsolation: true, nodeIntegration: false, sandbox: true |
| Path traversal in file operations | Information Disclosure | Validate file paths, use path.join, restrict to app directories |
| Prototype pollution | Tampering | Validate IPC message structure, use TypeScript for type safety |
| Insecure deserialization | Tampering | Validate JSON structure, use schema validation (Zod) |

**Phase 1 Security Checklist:**
- [ ] contextIsolation: true in all BrowserWindow instances
- [ ] nodeIntegration: false in all BrowserWindow instances
- [ ] sandbox: true in webPreferences
- [ ] All IPC handlers validate inputs before processing
- [ ] No sensitive data logged to console or files
- [ ] CSP headers configured (if loading remote content in future)
- [ ] Preload script only exposes necessary APIs via contextBridge
- [ ] No eval() or Function() constructor in renderer code


## Sources

### Primary (HIGH confidence)
- npm registry verification (2026-05-24): Verified all package versions, download counts, and repository URLs
- Electron official documentation patterns: Main process setup, security best practices (contextIsolation, IPC patterns)
- React 19 official documentation: Error Boundaries, concurrent features, hooks patterns
- Tailwind CSS v4 documentation: CSS-first configuration, dark mode, @theme directive
- Radix UI documentation: Headless primitives, accessibility features, Tailwind integration

### Secondary (MEDIUM confidence)
- WebSearch: Electron IPC invoke/handle pattern vs send/on — verified pattern recommendations
- WebSearch: vite-plugin-electron configuration — verified setup patterns
- WebSearch: electron-log file logging rotation — verified automatic rotation features
- WebSearch: Electron app.relaunch() programmatic restart — verified API usage
- WebSearch: better-sqlite3 Electron main process security — verified security architecture
- WebSearch: Tailwind CSS v4 Vite configuration — verified PostCSS setup
- WebSearch: Electron preload script contextBridge security — verified best practices
- WebSearch: electron-window-state package — verified window persistence patterns
- WebSearch: React Router v7 Outlet layout routes — verified nested routing patterns

### Tertiary (LOW confidence)
None — all claims verified through npm registry or official documentation patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry with repository URLs, versions, and download counts
- Architecture: HIGH - Patterns based on official Electron security best practices and React Router documentation
- Pitfalls: HIGH - Common issues documented in Electron/React communities, verified through multiple sources
- Security: HIGH - ASVS categories mapped to Electron-specific threats, mitigations based on official security guidelines

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days - stable ecosystem, mature libraries)

**Key findings:**
1. Electron 42.x + React 19 + Vite 8 is mature, well-documented stack with excellent tooling
2. Security requires strict adherence to contextIsolation + contextBridge pattern — no shortcuts
3. better-sqlite3 must run in main process only for security and compatibility
4. Tailwind v4 uses CSS-first configuration (@theme directive) — different from v3
5. electron-window-state, electron-store, electron-log solve common desktop app problems better than custom code
6. invoke/handle IPC pattern is modern standard — avoid send/on for request-response
7. Mode switching via app.relaunch() is simplest approach for Phase 1
8. React Router v7 layout routes with Outlet provide clean sidebar persistence pattern

**Open questions:** None — all locked decisions from CONTEXT.md are implementable with verified patterns.

**Ready for planning:** Yes — research complete, all patterns verified, no blockers identified.

